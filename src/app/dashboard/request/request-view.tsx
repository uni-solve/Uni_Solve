"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Clock, Eye, EyeOff, KeyRound, LifeBuoy, Loader2, Star, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ErrorState, ListSkeleton } from "@/components/app/states";
import { RequestTimeline } from "@/components/request-timeline";
import { StatusBadge } from "@/components/status-indicator";
import { FilesCard } from "@/components/student/files-card";
import { MilestonesCard } from "@/components/student/milestones-card";
import { PayMilestoneDialog } from "@/components/student/pay-milestone-dialog";
import { ReportIssueDialog } from "@/components/student/report-issue-dialog";
import { ReviewForm, Stars } from "@/components/student/review-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/content/pricing";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  applyCoupon,
  cancelRequest,
  getRequestByCode,
  getStudentOverview,
  getTrackingToken,
  removeCoupon,
  type Milestone,
} from "@/lib/data/student";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate, statusMeta } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export function RequestView() {
  const code = useSearchParams().get("id") ?? "";
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(() => getRequestByCode(code), [code], Boolean(code));
  const overview = useQuery(getStudentOverview, []);
  const [paying, setPaying] = useState<Milestone | null>(null);
  const [reporting, setReporting] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (!code) return <ErrorState message="No request selected." />;
  if (loading) return <ListSkeleton rows={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-semibold">Request not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may belong to a different account.</p>
        <Link href="/dashboard/requests" className={`${buttonVariants({ variant: "outline" })} mt-6`}>Back to my requests</Link>
      </div>
    );
  }

  const { request: r, milestones, events, attachments, payments, review } = data;
  const meta = statusMeta[r.status];
  const total = r.quoted_price != null ? r.quoted_price - r.discount_amount : null;
  const anyPaid = payments.some((p) => ["verified", "pending_verification"].includes(p.status));
  const closed = ["completed", "cancelled"].includes(r.status);
  const canCancel = ["submitted", "reviewing", "quoted"].includes(r.status) && !anyPaid;

  async function doApplyCoupon() {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    try {
      const res = await applyCoupon(r.id, coupon);
      toast.success(`Coupon applied — you save ${formatINR(res.discount)}`);
      setCoupon("");
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setCouponBusy(false);
    }
  }

  async function doCancel() {
    if (!confirm("Cancel this request? You can always post a new one.")) return;
    setCancelling(true);
    try {
      await cancelRequest(r.id);
      toast.success("Request cancelled");
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Link href="/dashboard/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> My requests
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">REQUEST #{r.code}</span>
            <StatusBadge tone={meta.tone} pulse={meta.live}>{meta.label}</StatusBadge>
            {r.is_anonymous && <Badge variant="muted"><EyeOff /> Anonymous</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold">{r.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="brand">{r.category?.name}</Badge>
            {r.classification?.skills?.slice(0, 6).map((s) => <Badge key={s.name} variant="outline">{s.name}</Badge>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/support?request=${r.code}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <LifeBuoy /> Request support
          </Link>
          {canCancel && (
            <Button variant="ghost" size="sm" onClick={doCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="animate-spin" /> : <X />} Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="grid min-w-0 content-start gap-6">
          {r.status === "submitted" || r.status === "reviewing" ? (
            <section className="rounded-2xl border border-info/30 bg-info-soft/50 p-5">
              <p className="flex items-center gap-2 font-medium"><Clock className="size-4 text-info" aria-hidden /> We&apos;re reviewing your requirements</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ll get a confirmed quote here and a notification. Estimated {r.estimate_min && r.estimate_max ? `${formatINR(r.estimate_min)} – ${formatINR(r.estimate_max)}` : "price on review"}.
              </p>
            </section>
          ) : null}

          {r.status === "quoted" && total != null && !anyPaid && (
            <section className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-5">
              <p className="text-sm font-medium text-accent-foreground">Your quote is ready</p>
              <div className="mt-2 flex items-baseline gap-3">
                <p className="text-3xl font-semibold">{formatINR(total)}</p>
                {r.discount_amount > 0 && <p className="text-sm text-muted-foreground line-through">{formatINR(r.quoted_price!)}</p>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {milestones.length > 1 ? `Paid in ${milestones.length} milestones — you only pay as work progresses.` : "Single payment."} No hidden charges.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                {r.coupon_id ? (
                  <Button variant="outline" size="sm" onClick={async () => { await removeCoupon(r.id).catch((e) => toast.error(friendlyError(e))); reload(); }}>
                    <Tag /> Coupon applied — remove
                  </Button>
                ) : (
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); doApplyCoupon(); }}>
                    <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" className="h-9 w-40 font-mono uppercase" />
                    <Button type="submit" variant="outline" size="sm" className="h-9" disabled={couponBusy || !coupon.trim()}>
                      {couponBusy && <Loader2 className="animate-spin" />} Apply
                    </Button>
                  </form>
                )}
              </div>
            </section>
          )}

          {milestones.length > 0 && (
            <MilestonesCard milestones={milestones} payments={payments} canPay={!closed && r.status !== "disputed"} onPay={setPaying} onChange={reload} />
          )}

          {r.status === "completed" && !review && <ReviewForm requestId={r.id} onDone={reload} />}
          {review && (
            <section className="rounded-2xl border bg-card p-5">
              <p className="flex items-center gap-2 text-sm font-medium"><Star className="size-4" aria-hidden /> Your review</p>
              <Stars value={review.rating} className="mt-2" />
              {review.comment && <p className="mt-2 text-sm text-muted-foreground">“{review.comment}”</p>}
            </section>
          )}

          <ChatPanel
            requestId={r.id}
            me={user!.id}
            participants={{ studentId: r.student_id, expertId: r.assigned_expert_id, expertName: r.expert?.display_name, studentAnonymous: r.is_anonymous }}
            disabled={r.status === "cancelled"}
            disabledReason="This request was cancelled."
            onReportIssue={() => setReporting(true)}
          />

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">Your description</h2>
            <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">{r.description}</p>
          </section>
        </div>

        {/* Side column */}
        <aside className="grid content-start gap-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Progress</h2>
            <RequestTimeline status={r.status} events={events} />
          </section>

          <section className="rounded-2xl border bg-card px-5 py-3">
            <dl className="divide-y">
              <Row label="Assigned expert">
                {r.expert ? (
                  <span>
                    {r.expert.display_name}
                    {r.expert.rating_count > 0 && <span className="block text-xs font-normal text-muted-foreground">★ {Number(r.expert.rating_avg).toFixed(1)} · {r.expert.completed_count} completed</span>}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Matching…</span>
                )}
              </Row>
              <Row label="Price">{total != null ? formatINR(total) : <span className="text-muted-foreground">Quote pending</span>}</Row>
              <Row label="Deadline">{r.deadline_at ? formatDate(r.deadline_at, true) : "Flexible"}</Row>
              <Row label="Payment">
                {milestones.length === 0 ? "—" : `${milestones.filter((m) => m.status !== "pending").length}/${milestones.length} paid`}
              </Row>
              <Row label="Submitted">{formatDate(r.submitted_at)}</Row>
            </dl>
          </section>

          <FilesCard requestId={r.id} me={user!.id} files={attachments} canUpload={!closed} onChange={reload} />

          <section className="rounded-2xl border bg-card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" aria-hidden /> Tracking key</p>
            <p className="mt-1 text-xs text-muted-foreground">Use with {r.code} on the public tracking page.</p>
            {token ? (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-xs break-all">{token}</p>
            ) : (
              <Button variant="outline" size="sm" className="mt-3" onClick={async () => setToken(await getTrackingToken(r.id).catch(() => null))}>
                <Eye /> Reveal
              </Button>
            )}
          </section>
        </aside>
      </div>

      <PayMilestoneDialog
        open={Boolean(paying)}
        onOpenChange={(o) => !o && setPaying(null)}
        milestone={paying}
        requestCode={r.code}
        userId={user!.id}
        credit={overview.data?.credit ?? 0}
        onPaid={() => {
          reload();
          overview.reload();
        }}
      />
      <ReportIssueDialog open={reporting} onOpenChange={setReporting} requestId={r.id} onDone={reload} />
    </>
  );
}
