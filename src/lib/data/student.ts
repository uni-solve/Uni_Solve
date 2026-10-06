import { getSupabase } from "@/lib/supabase/client";
import { must } from "@/lib/hooks/use-query";
import type { RequestStatus } from "@/lib/requests/status";

export type RequestSummary = {
  id: string;
  code: string;
  title: string;
  status: RequestStatus;
  submitted_at: string;
  deadline_at: string | null;
  quoted_price: number | null;
  discount_amount: number;
  estimate_min: number | null;
  estimate_max: number | null;
  category: { name: string } | null;
  expert: { display_name: string } | null;
};

const summaryColumns =
  "id, code, title, status, submitted_at, deadline_at, quoted_price, discount_amount, estimate_min, estimate_max, category:categories(name), expert:expert_profiles(display_name)";

export async function getStudentOverview() {
  return must(await getSupabase().rpc("get_student_overview")) as {
    active: number;
    completed: number;
    pending_payment: number;
    saved_experts: number;
    credit: number;
    unread_notifications: number;
  };
}

export async function listMyRequests(userId: string) {
  return must(
    await getSupabase().from("requests").select(summaryColumns).eq("student_id", userId).order("submitted_at", { ascending: false }),
  ) as unknown as RequestSummary[];
}

export type Milestone = {
  id: string;
  position: number;
  title: string;
  amount: number;
  status: "pending" | "funded" | "in_progress" | "delivered" | "revision_requested" | "approved" | "refunded";
  due_at: string | null;
  delivered_at: string | null;
  approved_at: string | null;
};

export type Payment = {
  id: string;
  milestone_id: string | null;
  amount: number;
  credit_applied: number;
  provider: string;
  provider_ref: string | null;
  status: "pending_verification" | "verified" | "rejected" | "refunded" | "partially_refunded";
  rejection_reason: string | null;
  refunded_amount: number;
  created_at: string;
};

export type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploader_id: string;
  created_at: string;
};

export type RequestDetail = RequestSummary & {
  description: string;
  work_type: string;
  deadline_option: string;
  budget_option: string;
  budget_min: number | null;
  budget_max: number | null;
  is_anonymous: boolean;
  contact_preference: string;
  estimate_days: number | null;
  assigned_expert_id: string | null;
  student_id: string;
  coupon_id: string | null;
  classification: { skills?: { name: string }[] };
  expert: { display_name: string; headline: string | null; rating_avg: number; rating_count: number; completed_count: number; response_time_hours: number } | null;
};

export async function getRequestByCode(code: string) {
  const supabase = getSupabase();
  const request = must(
    await supabase
      .from("requests")
      .select(
        `id, code, title, description, status, work_type, submitted_at, deadline_at, deadline_option, budget_option, budget_min, budget_max,
         is_anonymous, contact_preference, quoted_price, discount_amount, coupon_id, estimate_min, estimate_max, estimate_days,
         assigned_expert_id, student_id, classification, completed_at,
         category:categories(name),
         expert:expert_profiles(display_name, headline, rating_avg, rating_count, completed_count, response_time_hours)`,
      )
      .eq("code", code.toUpperCase())
      .maybeSingle(),
  ) as unknown as RequestDetail | null;
  if (!request) return null;

  const [milestones, events, attachments, payments, review] = await Promise.all([
    supabase.from("milestones").select("id, position, title, amount, status, due_at, delivered_at, approved_at").eq("request_id", request.id).order("position"),
    supabase.from("request_events").select("id, status, kind, message, created_at").eq("request_id", request.id).order("created_at"),
    supabase.from("request_attachments").select("id, storage_path, file_name, mime_type, size_bytes, uploader_id, created_at").eq("request_id", request.id).order("created_at", { ascending: false }),
    supabase.from("payments").select("id, milestone_id, amount, credit_applied, provider, provider_ref, status, rejection_reason, refunded_amount, created_at").eq("request_id", request.id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("rating, comment").eq("request_id", request.id).maybeSingle(),
  ]);

  return {
    request,
    milestones: must(milestones) as Milestone[],
    events: (must(events) as { id: number; status: RequestStatus | null; kind: string; message: string; created_at: string }[]).map((e) => ({ ...e, at: e.created_at })),
    attachments: must(attachments) as Attachment[],
    // Experts can't read payments (RLS) — that's expected, so default to empty.
    payments: (payments.data ?? []) as Payment[],
    review: review.data as { rating: number; comment: string | null } | null,
  };
}

export async function getTrackingToken(requestId: string) {
  return must(await getSupabase().rpc("get_tracking_token", { p_request: requestId })) as string | null;
}

export async function cancelRequest(requestId: string, reason?: string) {
  must(await getSupabase().rpc("cancel_request", { p_request: requestId, p_reason: reason ?? null }));
}

export async function applyCoupon(requestId: string, code: string) {
  return must(await getSupabase().rpc("apply_coupon", { p_request: requestId, p_code: code })) as { discount: number; total: number };
}

export async function removeCoupon(requestId: string) {
  must(await getSupabase().rpc("remove_coupon", { p_request: requestId }));
}

export async function reviewMilestone(milestoneId: string, approve: boolean, note?: string) {
  must(await getSupabase().rpc("student_review_milestone", { p_milestone: milestoneId, p_approve: approve, p_note: note ?? null }));
}

export async function submitReview(requestId: string, rating: number, comment: string, allowPublic: boolean) {
  must(await getSupabase().rpc("submit_review", { p_request: requestId, p_rating: rating, p_comment: comment, p_allow_public: allowPublic }));
}

export async function raiseDispute(requestId: string, reason: string, details: string) {
  must(await getSupabase().rpc("raise_dispute", { p_request: requestId, p_reason: reason, p_details: details }));
}

export async function deleteAttachment(att: Pick<Attachment, "id" | "storage_path">) {
  const supabase = getSupabase();
  must(await supabase.from("request_attachments").delete().eq("id", att.id));
  await supabase.storage.from("request-files").remove([att.storage_path]);
}

export async function listMyFiles() {
  return must(
    await getSupabase()
      .from("request_attachments")
      .select("id, storage_path, file_name, mime_type, size_bytes, uploader_id, created_at, request:requests(code, title)")
      .order("created_at", { ascending: false }),
  ) as unknown as (Attachment & { request: { code: string; title: string } | null })[];
}

export async function listMyPayments(userId: string) {
  return must(
    await getSupabase()
      .from("payments")
      .select("id, amount, credit_applied, provider, provider_ref, status, rejection_reason, refunded_amount, created_at, request:requests(code, title), milestone:milestones(title)")
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),
  ) as unknown as (Payment & { request: { code: string; title: string } | null; milestone: { title: string } | null })[];
}
