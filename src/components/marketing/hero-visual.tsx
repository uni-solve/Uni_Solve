import { Check, FileText, Paperclip, Send } from "lucide-react";
import { StatusBadge } from "@/components/status-indicator";
import { Badge } from "@/components/ui/badge";

const timeline = [
  { label: "Request submitted", done: true },
  { label: "Requirements reviewed", done: true },
  { label: "Expert assigned", done: true },
  { label: "In progress", current: true },
  { label: "Review" },
  { label: "Completed" },
];

/**
 * Illustrative product preview built from real UI primitives (not a screenshot).
 * Decorative — hidden from assistive tech; the hero copy carries the meaning.
 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand/10 blur-3xl" />
      <div className="rounded-2xl border bg-card p-2 shadow-2xl shadow-navy/10">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">unisolve / requests / US-48291</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1.1fr_1fr]">
          {/* Request card */}
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted-foreground">#US-48291</span>
              <StatusBadge tone="brand" pulse>
                In progress
              </StatusBadge>
            </div>
            <p className="mt-2 font-semibold">AI/ML Project Support</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="outline">Python</Badge>
              <Badge variant="outline">PyTorch</Badge>
              <Badge variant="outline">CNN</Badge>
            </div>
            <ol className="mt-4 space-y-2.5">
              {timeline.map((step) => (
                <li key={step.label} className="flex items-center gap-2.5 text-xs">
                  {step.done ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-success text-white">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  ) : step.current ? (
                    <span className="flex size-4 items-center justify-center rounded-full border-2 border-brand">
                      <span className="size-1.5 rounded-full bg-brand" />
                    </span>
                  ) : (
                    <span className="size-4 rounded-full border-2 border-border" />
                  )}
                  <span className={step.done || step.current ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">Milestone 2 of 3</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                  <div className="h-full w-2/3 rounded-full bg-brand" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Deadline</p>
                <p className="font-medium">In 3 days</p>
              </div>
            </div>
          </div>

          {/* Chat card */}
          <div className="flex flex-col rounded-xl border bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">Private chat · Expert</p>
            <div className="mt-3 flex-1 space-y-2 text-xs">
              <div className="w-fit max-w-[90%] rounded-lg rounded-tl-sm bg-muted px-3 py-2">
                Your loss plateaus because the learning rate is too high for this batch size.
              </div>
              <div className="w-fit max-w-[90%] rounded-lg rounded-tl-sm bg-muted px-3 py-2 font-mono text-[10.5px]">
                optim.Adam(lr=3e-4)
              </div>
              <div className="ml-auto w-fit max-w-[90%] rounded-lg rounded-tr-sm bg-brand px-3 py-2 text-brand-foreground">
                That fixed it — accuracy is climbing now!
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-muted-foreground">
                <FileText className="size-3.5" /> training_notes.pdf
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              <span className="flex-1">Write a message…</span>
              <Send className="size-3.5 text-brand" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
