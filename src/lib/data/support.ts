import { getSupabase } from "@/lib/supabase/client";
import { must } from "@/lib/hooks/use-query";

export type Ticket = {
  id: string;
  code: string;
  topic: string;
  subject: string;
  status: "open" | "awaiting_user" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  request: { code: string } | null;
};

export const ticketTopics = [
  { value: "chat", label: "Chat with support" },
  { value: "payment", label: "Payment issue" },
  { value: "expert", label: "Request issue" },
  { value: "refund", label: "Refund" },
  { value: "technical", label: "Technical problem" },
  { value: "other", label: "Other" },
] as const;

export async function listTickets() {
  return must(
    await getSupabase().from("support_tickets").select("id, code, topic, subject, status, created_at, updated_at, request:requests(code)").order("updated_at", { ascending: false }),
  ) as unknown as Ticket[];
}

export async function createTicket(topic: string, subject: string, body: string, requestId?: string | null) {
  return must(
    await getSupabase().rpc("create_support_ticket", { p_topic: topic, p_subject: subject, p_body: body, p_request: requestId ?? null }),
  ) as { id: string; code: string };
}

export async function listTicketMessages(ticketId: string) {
  return must(
    await getSupabase().from("ticket_messages").select("id, sender_id, is_staff, body, created_at").eq("ticket_id", ticketId).order("created_at"),
  ) as { id: number; sender_id: string | null; is_staff: boolean; body: string; created_at: string }[];
}

export async function replyToTicket(ticketId: string, senderId: string, body: string, isStaff = false) {
  must(await getSupabase().from("ticket_messages").insert({ ticket_id: ticketId, sender_id: senderId, body, is_staff: isStaff }));
}
