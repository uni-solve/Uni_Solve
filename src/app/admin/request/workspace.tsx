"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Loader2, Mail, PackageCheck, Phone, Send, User, X } from "lucide-react";
import { toast } from "sonner";
import { budgetLabel } from "@/components/admin/admin-request-row";
import { PaymentReviewRow } from "@/components/admin/payment-review";
import { ErrorState, ListSkeleton } from "@/components/app/states";
import { ChatPanel } from "@/components/chat/chat-panel";
import { RequestTimeline } from "@/components/request-timeline";
import { StatusBadge } from "@/components/status-indicator";
import { FilesCard } from "@/components/student/files-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/content/pricing";
import { useAuth } from "@/lib/auth/auth-provider";
import { cancelRequestAdmin, completeOnBehalf, getStudentContact, markDelivered, setQuote, type AdminPayment } from "@/lib/data/admin";
import { getRequestByCode } from "@/lib/data/student";
import { must, useQuery } from "@/lib/hooks/use-query";
import { formatDate, statusMeta } from "@/lib/requests/status";
import { friendlyError, getSupabase } from "@/lib/supabase/client";

async function loadWorkspace(code: string) {
  const detail = await getRequestByCode(code);
  if (!detail) return null;
  const [contact, payments] = await Promise.all([
    getStudentContact(detail.request.student_id),
    // Admin sees all payment columns (incl. proof) for this request.
    (async () =>
      must(
        await getSupabase()
          .from("payments")
          .select("id, milestone_id, amount, credit_applied, provider, provider_ref, proof_path, status, rejection_reason, refunded_amount, created_at, verified_at, student_id, request:requests(id, code, title), milestone:milestones(title)")
          .eq("request_id", detail.request.id)
          .order("created_at", { ascending: false }),
      ) as unknown as AdminPayment[])(),
  ]);
  return { ...detail, contact, adminPayments: payments };
}

function Panel({ title, children, tone }: { title: React.ReactNode; children: React.ReactNode; tone?: "brand" | "success" }) {
  return (
    <section className={`rounded-2xl border p-5 ${tone === "brand" ? "border-brand/30 bg-brand-soft/40" : tone === "success" ? "border-success/30 bg-success-soft/40" : "bg-card"}`}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function AdminWorkspace() {
  const code = useSearchParams().get("id") ?? "";
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(() => loadWorkspace(code), [code], Boolean(code));
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message={`Request ${code || ""} not found.`} />;

  const { request: r, milestones, events, attachments, adminPayments, contact, review } = data;
  const meta = statusMeta[r.status];
  const studentAmount = r.budget_option !== "suggest" && r.budget_min ? r.budget_max ?? r.budget_min : null;
  const canQuote = ["submitted", "reviewing", "quoted"].includes(r.status) && !adminPayments.some((p) => ["verified", "pending_verification"].includes(p.status));
  const pendingVerify = adminPayments.filter((p) => p.status === "pending_verification");
  const unpaid = milestones.filter((m) => m.status === "pending");

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Link href="/admin/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Requests
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">#{r.code}</span>
            <StatusBadge tone={meta.tone} pulse={meta.live}>{meta.label}</StatusBadge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{r.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="brand">{r.category?.name}</Badge>
            {r.classification?.skills?.slice(0, 6).map((s) => <Badge key={s.name} variant="outline">{s.name}</Badge>)}
          </div>
        </div>
        {["submitted", "reviewing", "quoted"].includes(r.status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const reason = prompt("Reason for cancelling (shown to the student):");
              if (reason !== null) run("cancel", () => cancelRequestAdmin(r.id, reason), "Request cancelled");
            }}
          >
            <X /> Cancel request
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 content-start gap-6">
          {/* 1. Respond with price */}
          {canQuote && (
            <Panel title={r.status === "quoted" ? "Quote sent — update it if needed" : "Respond to this request"} tone="brand">
              <p className="text-sm text-muted-foreground">
                Student&apos;s budget: <strong className="text-foreground">{budgetLabel(r)}</strong>
                {r.estimate_min && <> · typical {formatINR(r.estimate_min)}–{formatINR(r.estimate_max!)}</>}
                {r.quoted_price != null && <> · current quote <strong className="text-foreground">{formatINR(r.quoted_price)}</strong></>}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {studentAmount && r.status !== "quoted" && (
                  <Button className="w-fit" onClick={() => run("accept", () => setQuote(r.id, studentAmount), `Accepted ${formatINR(studentAmount)}`)} disabled={busy !== null}>
                    {busy === "accept" ? <Loader2 className="animate-spin" /> : <Check />} Accept {formatINR(studentAmount)}
                  </Button>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:w-44 sm:shrink-0">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" aria-label="Quote price" className="pl-7" />
                  </div>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to student (optional)" aria-label="Quote note" />
                  <Button
                    variant={studentAmount && r.status !== "quoted" ? "outline" : "default"}
                    className="h-10"
                    disabled={busy !== null || !Number(price)}
                    onClick={() => run("quote", () => setQuote(r.id, Math.round(Number(price)), note), "Quote sent")}
                  >
                    {busy === "quote" ? <Loader2 className="animate-spin" /> : <Send />} {studentAmount ? "Counter" : "Send quote"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Split automatically: 50% advance, 50% on delivery.</p>
              </div>
            </Panel>
          )}

          {/* 2. Payments */}
          {(milestones.length > 0 || adminPayments.length > 0) && (
            <section className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-sm font-semibold">Payments</h2>
                <span className="text-xs text-muted-foreground">
                  {milestones.map((m) => `${m.title.split(" (")[0]} ${formatINR(m.amount)} ${m.status === "pending" ? "· unpaid" : "· paid"}`).join("  ·  ")}
                </span>
              </div>
              {adminPayments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No payments submitted yet.</p>
              ) : (
                <div className="divide-y">
                  {adminPayments.map((p) => <PaymentReviewRow key={p.id} p={p} onChange={reload} />)}
                </div>
              )}
            </section>
          )}

          {/* 3. Deliver */}
          {r.status === "in_progress" && (
            <Panel title="Ready to deliver?" tone="success">
              <p className="text-sm text-muted-foreground">Share the files and explanation in the chat below first, then mark it delivered. The student will be asked to pay the balance and confirm.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="Delivery note (optional)" aria-label="Delivery note" />
                <Button className="h-10" disabled={busy !== null} onClick={() => run("deliver", () => markDelivered(r.id, deliveryNote), "Marked delivered — student notified")}>
                  {busy === "deliver" ? <Loader2 className="animate-spin" /> : <PackageCheck />} Mark delivered
                </Button>
              </div>
            </Panel>
          )}
          {r.status === "review" && (
            <Panel title="Delivered — waiting for the student" tone="success">
              <p className="text-sm text-muted-foreground">
                {unpaid.length ? `Balance of ${formatINR(unpaid.reduce((s, m) => s + m.amount, 0))} not paid yet.` : pendingVerify.length ? "Balance submitted — verify it above." : "Fully paid. The student can mark it complete, or you can close it."}
              </p>
              {!unpaid.length && !pendingVerify.length && (
                <Button className="mt-3" variant="outline" disabled={busy !== null} onClick={() => run("complete", () => completeOnBehalf(r.id), "Request completed")}>
                  {busy === "complete" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark complete
                </Button>
              )}
            </Panel>
          )}
          {review && (
            <Panel title={`Student review: ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`}>
              <p className="text-sm text-muted-foreground">{review.comment ?? "No comment."}</p>
            </Panel>
          )}

          <ChatPanel
            requestId={r.id}
            me={user!.id}
            participants={{ studentId: r.student_id, expertId: null, studentAnonymous: r.is_anonymous }}
            disabled={r.status === "cancelled"}
            disabledReason="This request was cancelled."
          />

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Problem description</h2>
            <p className="mt-3 text-sm whitespace-pre-wrap">{r.description}</p>
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><User className="size-4" aria-hidden /> Student</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Name</dt><dd>{contact.display_name ?? "—"}</dd></div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="break-all">{contact.email ? <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:underline"><Mail className="size-3.5" aria-hidden />{contact.email}</a> : contact.is_guest ? "Guest (no email yet)" : "—"}</dd>
              </div>
              {contact.phone && <div><dt className="text-xs text-muted-foreground">Phone</dt><dd><a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="size-3.5" aria-hidden />{contact.phone}</a></dd></div>}
              {contact.institution && <div><dt className="text-xs text-muted-foreground">College</dt><dd>{contact.institution}</dd></div>}
              <div><dt className="text-xs text-muted-foreground">History</dt><dd>{contact.requests} requests · {contact.completed} completed · joined {formatDate(contact.joined)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Progress</h2>
            <RequestTimeline status={r.status} events={events} />
          </section>

          <section className="rounded-2xl border bg-card p-5 text-sm">
            <dl className="grid gap-2">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Deadline</dt><dd className="text-right font-medium">{r.deadline_at ? formatDate(r.deadline_at, true) : "Flexible"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Submitted</dt><dd>{formatDate(r.submitted_at, true)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Price</dt><dd>{r.quoted_price != null ? formatINR(r.quoted_price - r.discount_amount) : "—"}</dd></div>
              {r.discount_amount > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Coupon</dt><dd>−{formatINR(r.discount_amount)}</dd></div>}
            </dl>
          </section>

          <FilesCard requestId={r.id} me={user!.id} files={attachments} canUpload={!["completed", "cancelled"].includes(r.status)} onChange={reload} />
        </aside>
      </div>
    </>
  );
}
