"use client";

import { useState } from "react";
import { Check, CircleDashed, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge, type Tone } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/content/pricing";
import { reviewMilestone, type Milestone, type Payment } from "@/lib/data/student";
import { friendlyError } from "@/lib/supabase/client";

const milestoneMeta: Record<Milestone["status"], { label: string; tone: Tone }> = {
  pending: { label: "Awaiting payment", tone: "warning" },
  funded: { label: "Paid", tone: "info" },
  in_progress: { label: "In progress", tone: "brand" },
  delivered: { label: "Delivered — review", tone: "warning" },
  revision_requested: { label: "Revision requested", tone: "brand" },
  approved: { label: "Approved", tone: "success" },
  refunded: { label: "Refunded", tone: "muted" },
};

export function MilestonesCard({
  milestones,
  payments,
  canPay,
  onPay,
  onChange,
}: {
  milestones: Milestone[];
  payments: Payment[];
  canPay: boolean;
  onPay: (m: Milestone) => void;
  onChange: () => void;
}) {
  const [revising, setRevising] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const nextPayable = milestones.find((m) => m.status === "pending");

  async function decide(m: Milestone, approve: boolean) {
    setBusy(m.id);
    try {
      await reviewMilestone(m.id, approve, approve ? undefined : note);
      toast.success(approve ? "Milestone approved" : "Revision requested");
      setRevising(null);
      setNote("");
      onChange();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="border-b px-5 py-3">
        <h2 className="text-sm font-semibold">Milestones & payments</h2>
      </div>
      <ol className="divide-y">
        {milestones.map((m) => {
          const pending = payments.find((p) => p.milestone_id === m.id && p.status === "pending_verification");
          const rejected = payments.find((p) => p.milestone_id === m.id && p.status === "rejected");
          const meta = pending ? { label: "Verifying payment", tone: "info" as Tone } : milestoneMeta[m.status];
          return (
            <li key={m.id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                {m.status === "approved" ? (
                  <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-success text-white"><Check className="size-3" strokeWidth={3} /></span>
                ) : (
                  <CircleDashed className="mt-0.5 size-5 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-sm font-semibold">{formatINR(m.amount)}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    {rejected && !pending && m.status === "pending" && (
                      <span className="text-xs text-destructive">Last payment not verified: {rejected.rejection_reason}</span>
                    )}
                  </div>

                  {canPay && m.id === nextPayable?.id && !pending && (
                    <Button size="sm" className="mt-3" onClick={() => onPay(m)}>
                      Pay {formatINR(m.amount)}
                    </Button>
                  )}

                  {m.status === "delivered" && (
                    <div className="mt-3">
                      {revising === m.id ? (
                        <div className="grid gap-2">
                          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should be changed?" aria-label="Revision notes" />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setRevising(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => decide(m, false)} disabled={busy === m.id || note.trim().length < 3}>
                              {busy === m.id && <Loader2 className="animate-spin" />} Send revision request
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => decide(m, true)} disabled={busy === m.id}>
                            {busy === m.id ? <Loader2 className="animate-spin" /> : <Check />} Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRevising(m.id)}>
                            <RotateCcw /> Request revision
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
