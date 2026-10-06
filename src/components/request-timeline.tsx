import { Check } from "lucide-react";
import { formatDate, timelineState, type RequestStatus } from "@/lib/requests/status";
import { cn } from "@/lib/utils";

/** ✓ done · ● current · ○ upcoming — the request progress timeline. */
export function RequestTimeline({
  status,
  events = [],
}: {
  status: RequestStatus;
  events?: { status: string | null; at: string }[];
}) {
  const steps = timelineState(status);
  const when = (key: string) => {
    const match = key === "reviewing" ? ["reviewing", "quoted"] : [key];
    return events.find((e) => e.status && match.includes(e.status))?.at;
  };

  return (
    <ol className="relative space-y-5" aria-label="Request progress">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3">
          {i < steps.length - 1 && (
            <span aria-hidden className={cn("absolute top-6 left-[11px] h-[calc(100%-4px)] w-px", s.state === "done" ? "bg-success" : "bg-border")} />
          )}
          {s.state === "done" ? (
            <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            </span>
          ) : s.state === "current" ? (
            <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-background">
              <span className="size-2 animate-pulse rounded-full bg-brand" />
            </span>
          ) : (
            <span className="relative z-10 size-6 shrink-0 rounded-full border-2 bg-background" />
          )}
          <div className="pt-0.5">
            <p className={cn("text-sm font-medium", s.state === "upcoming" && "text-muted-foreground")}>
              {s.label}
              <span className="sr-only"> — {s.state === "done" ? "completed" : s.state === "current" ? "current step" : "upcoming"}</span>
            </p>
            {when(s.key) && <p className="text-xs text-muted-foreground">{formatDate(when(s.key), true)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
