import { getSupabase } from "@/lib/supabase/client";
import { must } from "@/lib/hooks/use-query";
import type { RequestStatus } from "@/lib/requests/status";
import type { Payment } from "./student";

const sb = () => getSupabase();

export type AdminMetrics = {
  total_students: number;
  active_requests: number;
  completed_requests: number;
  total_requests: number;
  revenue: number;
  refunds: number;
  average_order_value: number;
  conversion_rate: number;
  repeat_customers: number;
  payments_to_verify: number;
  open_disputes: number;
  open_tickets: number;
};

export const getAdminMetrics = async () => must(await sb().rpc("get_admin_metrics")) as AdminMetrics;

export const getTimeseries = async (days: number) =>
  must(await sb().rpc("get_admin_timeseries", { p_days: days })) as { day: string; requests: number; completed: number; revenue: number; signups: number }[];

export const getCategoryBreakdown = async (days: number) =>
  must(await sb().rpc("admin_category_breakdown", { p_days: days })) as { category: string; requests: number; completed: number; revenue: number }[];

export type AdminRequestRow = {
  id: string;
  code: string;
  title: string;
  status: RequestStatus;
  submitted_at: string;
  updated_at: string;
  deadline_at: string | null;
  budget_option: string;
  budget_min: number | null;
  budget_max: number | null;
  quoted_price: number | null;
  discount_amount: number;
  estimate_min: number | null;
  estimate_max: number | null;
  student_id: string;
  category: { name: string } | null;
};

export async function listAdminRequests(status: RequestStatus[] | null, search: string) {
  let q = sb()
    .from("requests")
    .select("id, code, title, status, submitted_at, updated_at, deadline_at, budget_option, budget_min, budget_max, quoted_price, discount_amount, estimate_min, estimate_max, student_id, category:categories(name)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status?.length) q = q.in("status", status);
  const s = search.trim();
  if (s) q = /^US-?\d+$/i.test(s) ? q.ilike("code", `%${s.replace(/^us-?/i, "")}%`) : q.ilike("title", `%${s}%`);
  return must(await q) as unknown as AdminRequestRow[];
}

export type StudentContact = {
  id: string;
  display_name: string | null;
  email: string | null;
  is_guest: boolean;
  phone: string | null;
  institution: string | null;
  credit: number;
  joined: string;
  requests: number;
  completed: number;
  is_suspended: boolean;
};

export const getStudentContact = async (userId: string) =>
  must(await sb().rpc("admin_user_contact", { p_user: userId })) as StudentContact;

export const setQuote = async (requestId: string, price: number, note?: string) =>
  must(await sb().rpc("admin_set_quote", { p_request: requestId, p_price: price, p_milestones: null, p_note: note || null }));

export const markDelivered = async (requestId: string, note?: string) =>
  must(await sb().rpc("admin_mark_delivered", { p_request: requestId, p_note: note || null }));

export const completeOnBehalf = async (requestId: string) => must(await sb().rpc("complete_request", { p_request: requestId }));

export const cancelRequestAdmin = async (requestId: string, reason?: string) =>
  must(await sb().rpc("cancel_request", { p_request: requestId, p_reason: reason || null }));

export type AdminPayment = Payment & {
  proof_path: string | null;
  student_id: string;
  verified_at: string | null;
  request: { id: string; code: string; title: string } | null;
  milestone: { title: string } | null;
};

export async function listPayments(onlyPending: boolean) {
  let q = sb()
    .from("payments")
    .select("id, milestone_id, amount, credit_applied, provider, provider_ref, proof_path, status, rejection_reason, refunded_amount, created_at, verified_at, student_id, request:requests(id, code, title), milestone:milestones(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (onlyPending) q = q.eq("status", "pending_verification");
  return must(await q) as unknown as AdminPayment[];
}

export const reviewPayment = async (paymentId: string, approve: boolean, reason?: string) =>
  must(await sb().rpc("admin_review_payment", { p_payment: paymentId, p_approve: approve, p_reason: reason || null }));

export const refundPayment = async (paymentId: string, amount: number, asCredit: boolean, reason: string) =>
  must(await sb().rpc("admin_refund_payment", { p_payment: paymentId, p_amount: amount, p_as_credit: asCredit, p_reason: reason }));

export async function proofUrl(path: string) {
  const { data, error } = await sb().storage.from("payment-proofs").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export type StudentRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  is_guest: boolean;
  phone: string | null;
  is_suspended: boolean;
  joined: string;
  requests: number;
  completed: number;
  total_spent: number;
  credit: number;
  referral_code: string | null;
};

export const listStudents = async (search: string) =>
  must(await sb().rpc("admin_list_students", { p_search: search || null, p_limit: 200, p_offset: 0 })) as StudentRow[];

export const setSuspended = async (userId: string, suspended: boolean) =>
  must(await sb().rpc("admin_set_suspended", { p_user: userId, p_suspended: suspended, p_reason: null }));

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount: number | null;
  min_order: number;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  first_order_only: boolean;
  is_active: boolean;
  created_at: string;
};

export async function listCoupons() {
  const coupons = must(await sb().from("coupons").select("*").order("created_at", { ascending: false })) as Coupon[];
  const uses = must(await sb().from("coupon_redemptions").select("coupon_id")) as { coupon_id: string }[];
  return coupons.map((c) => ({ ...c, used: uses.filter((u) => u.coupon_id === c.id).length }));
}

export const saveCoupon = async (c: Partial<Coupon> & { code: string }) =>
  c.id ? must(await sb().from("coupons").update(c).eq("id", c.id)) : must(await sb().from("coupons").insert(c));

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  allow_public: boolean;
  status: "pending" | "published" | "hidden";
  created_at: string;
  request: { code: string; title: string } | null;
};

export const listReviews = async () =>
  must(await sb().from("reviews").select("id, rating, comment, allow_public, status, created_at, request:requests(code, title)").order("created_at", { ascending: false })) as unknown as ReviewRow[];

export const setReviewStatus = async (id: string, status: ReviewRow["status"]) => must(await sb().from("reviews").update({ status }).eq("id", id));

export type DisputeRow = {
  id: string;
  reason: string;
  details: string;
  status: "open" | "investigating" | "resolved_refund" | "resolved_no_refund" | "closed";
  resolution: string | null;
  created_at: string;
  request: { code: string; title: string } | null;
};

export const listDisputes = async () =>
  must(await sb().from("disputes").select("id, reason, details, status, resolution, created_at, request:requests(code, title)").order("created_at", { ascending: false })) as unknown as DisputeRow[];

export const resolveDispute = async (id: string, userId: string, status: DisputeRow["status"], resolution: string) =>
  must(await sb().from("disputes").update({ status, resolution, resolved_by: userId, resolved_at: new Date().toISOString() }).eq("id", id));

export const listAdminTickets = async () =>
  must(
    await sb().from("support_tickets").select("id, code, topic, subject, status, created_at, updated_at, user_id, request:requests(code)").order("updated_at", { ascending: false }),
  ) as unknown as { id: string; code: string; topic: string; subject: string; status: "open" | "awaiting_user" | "resolved" | "closed"; created_at: string; updated_at: string; user_id: string; request: { code: string } | null }[];

export const setTicketStatus = async (id: string, status: string) => must(await sb().from("support_tickets").update({ status }).eq("id", id));

export type Settings = {
  upi_id: string | null;
  upi_payee_name: string | null;
  upi_qr_path: string | null;
  referral_reward: number;
  referral_enabled: boolean;
  public_stats_threshold: number;
};

export const getSettings = async () =>
  must(await sb().from("platform_settings").select("upi_id, upi_payee_name, upi_qr_path, referral_reward, referral_enabled, public_stats_threshold").single()) as Settings;

export const saveSettings = async (patch: Partial<Settings>) => must(await sb().from("platform_settings").update(patch).eq("id", true));

const QR_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

export async function uploadUpiQr(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = QR_TYPES[ext];
  if (!type) throw new Error("Upload the QR as PNG, JPG or WEBP");
  if (file.size > 2 * 1024 * 1024) throw new Error("QR image must be 2 MB or smaller");
  const path = `upi-qr-${Date.now()}.${ext}`; // new name each time so caches refresh
  const { error } = await sb().storage.from("platform").upload(path, file, { contentType: type });
  if (error) throw error;
  await saveSettings({ upi_qr_path: path });
  return path;
}

export const listAudit = async () =>
  must(await sb().from("audit_logs").select("id, actor_id, action, entity_type, entity_id, details, created_at").order("id", { ascending: false }).limit(200)) as {
    id: number;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }[];
