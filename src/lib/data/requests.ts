import { getSupabase } from "@/lib/supabase/client";
import {
  safeFileName,
  uploadMimeType,
  type BudgetOption,
  type ContactPreference,
  type DeadlineOption,
  type WorkType,
} from "@/lib/requests/options";

export type Classification = {
  category_id: number;
  category_slug: string;
  category_name: string;
  confidence: number;
  skills: { id: number; slug: string; name: string; score: number }[];
};

export type Estimate = { min: number; max: number; days: number; uses_milestones: boolean };

export type Preview = Classification & { estimate: Estimate };

export type NewRequest = {
  workType: WorkType;
  title: string;
  description: string;
  deadline: DeadlineOption;
  deadlineAt: string | null;
  budget: BudgetOption;
  budgetMin: number | null;
  budgetMax: number | null;
  isAnonymous: boolean;
  contact: ContactPreference;
};

export type CreatedRequest = {
  id: string;
  code: string;
  tracking_token: string;
  classification: Classification;
  estimate: Estimate;
};

export async function previewRequest(input: Pick<NewRequest, "workType" | "title" | "description" | "deadline" | "deadlineAt">) {
  const { data, error } = await getSupabase().rpc("preview_request", {
    p_work_type: input.workType,
    p_title: input.title,
    p_description: input.description,
    p_deadline: input.deadline,
    p_deadline_at: input.deadlineAt,
  });
  if (error) throw error;
  return data as Preview;
}

/** Ensures there's a session; guests get a private anonymous one. */
export async function ensureSession() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session!;
}

export async function createRequest(input: NewRequest) {
  const { data, error } = await getSupabase().rpc("create_request", {
    p_work_type: input.workType,
    p_title: input.title,
    p_description: input.description,
    p_deadline: input.deadline,
    p_deadline_at: input.deadlineAt,
    p_budget: input.budget,
    p_budget_min: input.budgetMin,
    p_budget_max: input.budgetMax,
    p_is_anonymous: input.isAnonymous,
    p_contact: input.contact,
  });
  if (error) throw error;
  return data as CreatedRequest;
}

/** Uploads to the private bucket, then records the attachment (both checked by RLS). */
export async function uploadAttachment(requestId: string, uploaderId: string, file: File, messageId?: string) {
  const supabase = getSupabase();
  const contentType = uploadMimeType(file);
  if (!contentType) throw new Error(`${file.name}: this file type isn't supported`);
  const path = `${requestId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

  const { error: upErr } = await supabase.storage.from("request-files").upload(path, file, { contentType, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("request_attachments")
    .insert({
      request_id: requestId,
      uploader_id: uploaderId,
      storage_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: contentType,
      size_bytes: file.size,
      message_id: messageId ?? null,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("request-files").remove([path]); // don't leave orphans
    throw error;
  }
  return data.id as string;
}

/** Short-lived signed URL for a private file (default 2 minutes). */
export async function signedFileUrl(path: string, seconds = 120, download?: string) {
  const { data, error } = await getSupabase().storage.from("request-files").createSignedUrl(path, seconds, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function trackRequest(code: string, token: string) {
  const { data, error } = await getSupabase().rpc("track_request", { p_code: code, p_token: token });
  if (error) throw error;
  return data as null | {
    code: string;
    status: string;
    category: string;
    submitted_at: string;
    events: { status: string | null; message: string; at: string }[];
  };
}
