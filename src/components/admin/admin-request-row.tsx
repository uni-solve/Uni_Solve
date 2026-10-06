import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-indicator";
import { formatINR } from "@/content/pricing";
import type { AdminRequestRow } from "@/lib/data/admin";
import { formatDate, statusMeta } from "@/lib/requests/status";

export function budgetLabel(r: Pick<AdminRequestRow, "budget_option" | "budget_min" | "budget_max">) {
  if (r.budget_option === "suggest" || r.budget_min == null) return "Asked us to suggest";
  if (r.budget_max && r.budget_max !== r.budget_min) return `${formatINR(r.budget_min)}–${formatINR(r.budget_max)}`;
  return formatINR(r.budget_min);
}

export function AdminRequestRowItem({ r }: { r: AdminRequestRow }) {
  const meta = statusMeta[r.status];
  const overdue = r.deadline_at && new Date(r.deadline_at) < new Date() && !["completed", "cancelled"].includes(r.status);
  return (
    <Link href={`/admin/request?id=${r.code}`} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{r.code}</span>
          <StatusBadge tone={meta.tone} pulse={meta.live}>{meta.label}</StatusBadge>
          {overdue && <StatusBadge tone="danger">Overdue</StatusBadge>}
        </div>
        <p className="mt-1 truncate text-sm font-medium">{r.title}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span>{r.category?.name}</span>
          <span>Budget: {budgetLabel(r)}</span>
          {r.quoted_price != null && <span>Quoted {formatINR(r.quoted_price - r.discount_amount)}</span>}
          <span>Due {r.deadline_at ? formatDate(r.deadline_at, true) : "—"}</span>
        </p>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:block">{formatDate(r.submitted_at)}</span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}
