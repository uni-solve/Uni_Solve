"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/lib/data/student";
import { friendlyError } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const labels = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= value ? "fill-warning text-warning" : "text-border")} aria-hidden />
      ))}
    </span>
  );
}

export function ReviewForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [allowPublic, setAllowPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!rating) return toast.error("Choose a rating");
    setBusy(true);
    try {
      await submitReview(requestId, rating, comment, allowPublic);
      toast.success("Thanks for your review!");
      onDone();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-5">
      <h2 className="text-lg font-semibold">How was your experience?</h2>
      <fieldset className="mt-3">
        <legend className="sr-only">Rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <label key={i} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(i)}>
              <input type="radio" name="rating" value={i} checked={rating === i} onChange={() => setRating(i)} className="peer sr-only" aria-label={`${i} star${i > 1 ? "s" : ""}`} />
              <Star className={cn("size-8 transition-colors peer-focus-visible:ring-2", i <= (hover || rating) ? "fill-warning text-warning" : "text-border")} aria-hidden />
            </label>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{labels[hover || rating]}</span>
        </div>
      </fieldset>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="review-comment">What did you like?</Label>
        <Textarea id="review-comment" rows={3} maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <label className="mt-3 flex items-center gap-2.5 text-sm text-muted-foreground">
        <Checkbox checked={allowPublic} onCheckedChange={(v) => setAllowPublic(Boolean(v))} />
        Show my review on UniSolve as “Verified Student” (no name shown)
      </label>
      <Button className="mt-4" onClick={submit} disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} Submit review
      </Button>
    </div>
  );
}
