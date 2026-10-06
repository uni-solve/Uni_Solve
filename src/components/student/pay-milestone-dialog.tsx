"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/content/pricing";
import { getPaymentSettings, publicPlatformUrl, submitUpiPayment, upiLink, type PaymentSettings } from "@/lib/data/payments";
import type { Milestone } from "@/lib/data/student";
import { friendlyError } from "@/lib/supabase/client";

export function PayMilestoneDialog({
  open,
  onOpenChange,
  milestone,
  requestCode,
  userId,
  credit,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: Milestone | null;
  requestCode: string;
  userId: string;
  credit: number;
  onPaid: () => void;
}) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [utr, setUtr] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [useCredit, setUseCredit] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Reset the form only when the dialog opens — not when settings arrive,
  // which would wipe a UTR the student already typed.
  useEffect(() => {
    if (!open) return;
    setUtr("");
    setProof(null);
    setError(undefined);
  }, [open]);

  useEffect(() => {
    if (open && !settings) getPaymentSettings().then(setSettings).catch((e) => setError(friendlyError(e)));
  }, [open, settings]);

  if (!milestone) return null;
  const creditUsed = useCredit ? Math.min(credit, milestone.amount) : 0;
  const due = milestone.amount - creditUsed;
  const qr = publicPlatformUrl(settings?.upi_qr_path ?? null);
  const link = settings && due > 0 ? upiLink(settings, due, `${requestCode} ${milestone.title}`.slice(0, 50)) : null;

  async function submit() {
    setError(undefined);
    if (due > 0 && !/^[0-9A-Za-z]{10,22}$/.test(utr.trim())) return setError("Enter the 12-digit UTR / transaction ID from your UPI app");
    setBusy(true);
    try {
      await submitUpiPayment({ userId, milestoneId: milestone!.id, utr, proof, useCredit });
      toast.success(due > 0 ? "Payment submitted — we'll verify it shortly" : "Paid with credit");
      onOpenChange(false);
      onPaid();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {formatINR(milestone.amount)}</DialogTitle>
          <DialogDescription>
            {requestCode} · {milestone.title}
          </DialogDescription>
        </DialogHeader>

        {credit > 0 && (
          <label className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
            <Checkbox checked={useCredit} onCheckedChange={(v) => setUseCredit(Boolean(v))} />
            Use my UniSolve credit ({formatINR(credit)} available)
          </label>
        )}

        {due > 0 && (
          <>
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Amount to pay</p>
              <p className="text-3xl font-semibold">{formatINR(due)}</p>
              {!settings ? (
                <Loader2 className="mx-auto mt-4 size-5 animate-spin text-muted-foreground" />
              ) : !settings.upi_id && !qr ? (
                <p className="mt-3 text-sm text-warning">UPI details are being set up. Please check back soon or contact support.</p>
              ) : (
                <>
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="UniSolve UPI QR code" className="mx-auto mt-4 size-48 rounded-lg border bg-white object-contain p-2" />
                  ) : (
                    <QrCode className="mx-auto mt-4 size-10 text-muted-foreground" aria-hidden />
                  )}
                  {settings.upi_id && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                      <span className="font-mono">{settings.upi_id}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Copy UPI ID"
                        onClick={() => navigator.clipboard.writeText(settings.upi_id!).then(() => toast.success("UPI ID copied"))}
                      >
                        <Copy />
                      </Button>
                    </div>
                  )}
                  {link && (
                    <a href={link} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline sm:hidden">
                      Open UPI app <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Scan with GPay, PhonePe, Paytm or any UPI app. Add {requestCode} in the note.</p>
                </>
              )}
            </div>

            <FormField id="utr" label="UPI transaction ID (UTR)" hint="12-digit number shown in your UPI app after paying.">
              {(aria) => <Input {...aria} inputMode="numeric" className="font-mono" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="412345678901" />}
            </FormField>
            <FormField id="proof" label="Payment screenshot" optional hint="Speeds up verification. PNG, JPG or PDF up to 5 MB.">
              {(aria) => <Input {...aria} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />}
            </FormField>
          </>
        )}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
          Our team verifies every payment before work starts. If something&apos;s wrong, we&apos;ll contact you here.
        </p>
        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || (!settings && due > 0)}>
            {busy && <Loader2 className="animate-spin" />} {due > 0 ? "I've paid — submit" : "Pay with credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
