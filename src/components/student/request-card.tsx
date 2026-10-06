import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-indicator";
import { formatINR } from "@/content/pricing";
import type { RequestSummary } from "@/lib/data/student";
import { formatDate, statusMeta } from "@/lib/requests/status";

export function RequestCard({ r, href }: { r: RequestSummary; href: string }) {
  const meta = statusMeta[r.status];
  const price = r.quoted_price != null ? formatINR(r.quoted_price - r.discount_amount) : r.estimate_min ? `~${formatINR(r.estimate_min)}+` : null;
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{r.code}</span>
          <StatusBadge tone={meta.tone} pulse={meta.live}>{meta.label}</StatusBadge>
        </div>
        <p className="mt-1.5 truncate font-medium">{r.title}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{r.category?.name}</span>
          {r.expert && <span>Expert: {r.expert.display_name}</span>}
          {r.deadline_at && <span>Due {formatDate(r.deadline_at)}</span>}
          {price && <span>{price}</span>}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
