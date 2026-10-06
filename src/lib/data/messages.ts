import { getSupabase } from "@/lib/supabase/client";
import { must } from "@/lib/hooks/use-query";
import { uploadAttachment } from "./requests";

export type ChatMessage = {
  id: string;
  request_id: string;
  sender_id: string | null;
  kind: "text" | "code" | "file" | "image" | "system" | "payment" | "milestone";
  body: string | null;
  code_language: string | null;
  attachment_id: string | null;
  created_at: string;
  attachment?: { id: string; file_name: string; storage_path: string; mime_type: string; size_bytes: number } | null;
};

const columns =
  "id, request_id, sender_id, kind, body, code_language, attachment_id, created_at, attachment:request_attachments!messages_attachment_id_fkey(id, file_name, storage_path, mime_type, size_bytes)";

export async function listMessages(requestId: string) {
  return must(
    await getSupabase().from("messages").select(columns).eq("request_id", requestId).order("created_at", { ascending: true }).limit(500),
  ) as unknown as ChatMessage[];
}

export async function getMessage(id: string) {
  return must(await getSupabase().from("messages").select(columns).eq("id", id).single()) as unknown as ChatMessage;
}

export async function sendText(requestId: string, senderId: string, body: string, codeLanguage?: string) {
  must(
    await getSupabase()
      .from("messages")
      .insert({ request_id: requestId, sender_id: senderId, kind: codeLanguage ? "code" : "text", body, code_language: codeLanguage ?? null }),
  );
}

export async function sendFile(requestId: string, senderId: string, file: File, caption?: string) {
  const attachmentId = await uploadAttachment(requestId, senderId, file);
  must(
    await getSupabase()
      .from("messages")
      .insert({
        request_id: requestId,
        sender_id: senderId,
        kind: file.type.startsWith("image/") ? "image" : "file",
        body: caption || null,
        attachment_id: attachmentId,
      }),
  );
}

export function subscribeToMessages(requestId: string, onInsert: (id: string) => void) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`messages:${requestId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${requestId}` }, (p) =>
      onInsert((p.new as { id: string }).id),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Conversations list: the user's requests with their latest message. */
export async function listConversations() {
  const supabase = getSupabase();
  const requests = must(
    await supabase
      .from("requests")
      .select("id, code, title, status, assigned_expert_id, student_id, expert:expert_profiles(display_name)")
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(50),
  ) as unknown as { id: string; code: string; title: string; status: string; expert: { display_name: string } | null }[];
  if (!requests.length) return [];
  const latest = must(
    await supabase
      .from("messages")
      .select("request_id, body, kind, created_at, sender_id")
      .in("request_id", requests.map((r) => r.id))
      .order("created_at", { ascending: false })
      .limit(300),
  ) as { request_id: string; body: string | null; kind: string; created_at: string; sender_id: string | null }[];
  return requests
    .map((r) => ({ ...r, last: latest.find((m) => m.request_id === r.id) ?? null }))
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
}
