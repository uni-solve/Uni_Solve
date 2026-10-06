"use client";

import { useState } from "react";
import { Check, ImageIcon, Loader2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/content/pricing";
import { proofUrl, refundPayment, reviewPayment, type AdminPayment } from "@/lib/data/admin";
import { paymentMeta } from "@/lib/requests/payment-status";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

/** One payment row with verify / reject / refund actions. */
export function PaymentReviewRow({ p, showRequest = false, onChange }: { p: AdminPayment; showRequest?: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState<"ok" | "no" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const total = p.amount + p.credit_applied;

  async function decide(approve: boolean) {
    setBusy(approve ? "ok" : "no");
    try {
      await reviewPayment(p.id, approve, approve ? undefined : reason.trim());
      toast.success(approve ? "Payment verified" : "Payment rejected — student notified");
      setRejecting(false);
      onChange();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  async function viewProof() {
    try {
      window.open(await proofUrl(p.proof_path!), "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {formatINR(total)} <span className="font-normal text-muted-foreground">· {p.milestone?.title ?? "Payment"}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {showRequest && p.request && <>#{p.request.code} · </>}
            {p.provider === "credit" ? "Paid with credit" : <>UTR <span className="font-mono text-foreground">{p.provider_ref}</span></>}
            {p.credit_applied > 0 && p.provider !== "credit" && ` · ${formatINR(p.credit_applied)} credit`} · {formatDate(p.created_at, true)}
          </p>
          {p.rejection_reason && <p className="mt-1 text-xs text-destructive">Rejected: {p.rejection_reason}</p>}
          {p.refunded_amount > 0 && <p className="mt-1 text-xs text-muted-foreground">{formatINR(p.refunded_amount)} refunded</p>}
        </div>
        <StatusBadge tone={paymentMeta[p.status].tone}>{paymentMeta[p.status].label}</StatusBadge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {p.proof_path && (
          <Button size="sm" variant="outline" onClick={viewProof}>
            <ImageIcon /> Screenshot
          </Button>
        )}
        {p.status === "pending_verification" && !rejecting && (
          <>
            <Button size="sm" onClick={() => decide(true)} disabled={busy !== null}>
              {busy === "ok" ? <Loader2 className="animate-spin" /> : <Check />} Received — verify
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
              <X /> Not received
            </Button>
          </>
        )}
        {(p.status === "verified" || p.status === "partially_refunded") && (
          <Button size="sm" variant="ghost" onClick={() => setRefunding(true)}>
            <Undo2 /> Refund
          </Button>
        )}
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. UTR not found in bank statement" aria-label="Rejection reason" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-10" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" className="h-10" onClick={() => decide(false)} disabled={busy !== null || reason.trim().length < 3}>
              {busy === "no" && <Loader2 className="animate-spin" />} Reject
            </Button>
          </div>
        </div>
      )}

      <RefundDialog open={refunding} onOpenChange={setRefunding} payment={p} onDone={onChange} />
    </div>
  );
}

function RefundDialog({ open, onOpenChange, payment, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; payment: AdminPayment; onDone: () => void }) {
  const max = payment.amount + payment.credit_applied - payment.refunded_amount;
  const [amount, setAmount] = useState(String(max));
  const [asCredit, setAsCredit] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = Math.round(Number(amount));
    if (!n || n < 1 || n > max) return toast.error(`Enter an amount between ₹1 and ${formatINR(max)}`);
    if (reason.trim().length < 3) return toast.error("Add a short reason");
    setBusy(true);
    try {
      await refundPayment(payment.id, n, asCredit, reason.trim());
      toast.success(asCredit ? "Credit added to the student's account" : "Refund recorded — send the UPI transfer to the student");
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>Up to {formatINR(max)}. UPI refunds must be sent by you from your UPI app — this records it and notifies the student.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Refund amount" />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Refund reason" />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={asCredit} onCheckedChange={(v) => setAsCredit(Boolean(v))} /> Refund as UniSolve credit instead
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Refund</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
