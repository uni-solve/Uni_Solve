"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { raiseDispute } from "@/lib/data/student";
import { friendlyError } from "@/lib/supabase/client";

const reasons = [
  { value: "quality", label: "Quality of support" },
  { value: "unresponsive", label: "No response" },
  { value: "deadline", label: "Missed deadline" },
  { value: "integrity", label: "Academic integrity concern" },
  { value: "payment", label: "Payment problem" },
  { value: "conduct", label: "Inappropriate behaviour" },
  { value: "other", label: "Something else" },
];

export function ReportIssueDialog({ open, onOpenChange, requestId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; requestId: string; onDone?: () => void }) {
  const [reason, setReason] = useState("quality");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (details.trim().length < 10) return setError("Please describe the issue (at least 10 characters)");
    setBusy(true);
    setError(undefined);
    try {
      await raiseDispute(requestId, reason, details.trim());
      toast.success("Issue reported. Our support team will review it.");
      setDetails("");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>A UniSolve team member reviews every report.</DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">What&apos;s wrong?</legend>
          {reasons.map((r) => (
            <label key={r.value} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[var(--brand)]" />
              {r.label}
            </label>
          ))}
        </fieldset>
        <FormField id="details" label="Details" error={error}>
          {(aria) => <Textarea {...aria} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} />}
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
