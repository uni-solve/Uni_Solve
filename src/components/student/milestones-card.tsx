"use client";

import { useState } from "react";
import { Check, CheckCircle2, CircleDashed, Loader2, PackageCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, type Tone } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/content/pricing";
import { completeRequest, requestChanges, type Milestone, type Payment } from "@/lib/data/student";
import type { RequestStatus } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

const partMeta: Record<Milestone["status"], { label: string; tone: Tone }> = {
  pending: { label: "Not paid", tone: "warning" },
  funded: { label: "Paid", tone: "success" },
  in_progress: { label: "Paid", tone: "success" },
  delivered: { label: "Paid", tone: "success" },
  revision_requested: { label: "Paid", tone: "success" },
  approved: { label: "Paid", tone: "success" },
  refunded: { label: "Refunded", tone: "muted" },
};

/**
 * Solo-mode payments: 50% advance before work starts, 50% once delivered,
 * then the student marks the request complete (or asks for changes).
 */
export function MilestonesCard({
  requestId,
  status,
  milestones,
  payments,
  onPay,
  onChange,
}: {
  requestId: string;
  status: RequestStatus;
  milestones: Milestone[];
  payments: Payment[];
  onPay: (m: Milestone) => void;
  onChange: () => void;
}) {
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"complete" | "changes" | null>(null);

  const verifying = (m: Milestone) => payments.some((p) => p.milestone_id === m.id && p.status === "pending_verification");
  const nextPending = milestones.find((m) => m.status === "pending");
  const anyVerifying = milestones.some(verifying);
  // The advance can be paid once quoted; later parts only after delivery.
  const canPay = (m: Milestone) =>
    m.id === nextPending?.id && !verifying(m) && (m.position === 1 ? status === "quoted" : ["in_progress", "review"].includes(status));
  const delivered = status === "review";
  const canComplete = delivered && !nextPending && !anyVerifying;

  async function act(kind: "complete" | "changes") {
    setBusy(kind);
    try {
      if (kind === "complete") {
        await completeRequest(requestId);
        toast.success("Marked complete — thank you!");
      } else {
        await requestChanges(requestId, note.trim());
        toast.success("Change request sent");
        setChanging(false);
        setNote("");
      }
      onChange();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border bg-card">
      {delivered && (
        <div className="border-b bg-success-soft/50 px-5 py-4">
          <p className="flex items-center gap-2 font-medium">
            <PackageCheck className="size-4 text-success" aria-hidden /> Your solution has been delivered
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextPending
              ? `Check the chat for files and notes. Pay the remaining ${formatINR(nextPending.amount)} to complete.`
              : anyVerifying
                ? "We're verifying your last payment. You can mark it complete once it's confirmed."
                : "Check the chat for files and notes, then mark it complete — or ask for changes."}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-semibold">Payments</h2>
        <span className="text-xs text-muted-foreground">50% to start · 50% on delivery</span>
      </div>
      <ol className="divide-y">
        {milestones.map((m) => {
          const rejected = payments.find((p) => p.milestone_id === m.id && p.status === "rejected");
          const meta = verifying(m) ? { label: "Verifying", tone: "info" as Tone } : partMeta[m.status];
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              {m.status !== "pending" && m.status !== "refunded" ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-success text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              ) : (
                <CircleDashed className="size-5 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.title}</p>
                {rejected && m.status === "pending" && !verifying(m) && (
                  <p className="text-xs text-destructive">Last payment not verified: {rejected.rejection_reason}</p>
                )}
              </div>
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              <p className="w-20 text-right text-sm font-semibold">{formatINR(m.amount)}</p>
              {canPay(m) && (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => onPay(m)}>
                  Pay {formatINR(m.amount)}
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      {delivered && (
        <div className="border-t px-5 py-4">
          {changing ? (
            <div className="grid gap-2">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should be changed or explained?" aria-label="Requested changes" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setChanging(false)}>Cancel</Button>
                <Button size="sm" onClick={() => act("changes")} disabled={busy !== null || note.trim().length < 3}>
                  {busy === "changes" && <Loader2 className="animate-spin" />} Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => act("complete")} disabled={!canComplete || busy !== null}>
                {busy === "complete" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark complete
              </Button>
              <Button size="sm" variant="outline" onClick={() => setChanging(true)}>
                <RotateCcw /> Request changes
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
