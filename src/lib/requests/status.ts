import type { Tone } from "@/components/status-indicator";

export type RequestStatus =
  | "submitted" | "reviewing" | "quoted" | "assigned" | "in_progress" | "review" | "completed" | "cancelled" | "disputed";

export const statusMeta: Record<RequestStatus, { label: string; tone: Tone; live?: boolean }> = {
  submitted: { label: "Submitted", tone: "info" },
  reviewing: { label: "Reviewing", tone: "info", live: true },
  quoted: { label: "Quote ready", tone: "warning" },
  assigned: { label: "Payment confirmed", tone: "brand" },
  in_progress: { label: "In progress", tone: "brand", live: true },
  review: { label: "Delivered", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
  disputed: { label: "Under review", tone: "danger" },
};

/** The six-step public timeline from the spec, derived from the current status. */
export const timelineSteps = [
  { key: "submitted", label: "Request Submitted" },
  { key: "reviewing", label: "Requirements Reviewed" },
  { key: "assigned", label: "Payment Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
] as const;

const progressIndex: Record<RequestStatus, number> = {
  submitted: 0,
  reviewing: 0,
  quoted: 1,
  assigned: 2,
  in_progress: 3,
  review: 4,
  completed: 5,
  cancelled: -1,
  disputed: -1,
};

/** For each timeline step: done, current, or upcoming. */
export function timelineState(status: RequestStatus) {
  const idx = progressIndex[status];
  return timelineSteps.map((step, i) => ({
    ...step,
    state: status === "completed" || i < idx ? "done" : i === idx ? "current" : "upcoming",
  })) as { key: string; label: string; state: "done" | "current" | "upcoming" }[];
}

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}
