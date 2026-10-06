"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Inbox, IndianRupee, LifeBuoy, Repeat, Users } from "lucide-react";
import { AdminRequestRowItem } from "@/components/admin/admin-request-row";
import { EmptyState, ErrorState, ListSkeleton, PageHeader, StatCard } from "@/components/app/states";
import { formatINR } from "@/content/pricing";
import { getAdminMetrics, listAdminRequests } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";

export default function AdminOverviewPage() {
  const metrics = useQuery(getAdminMetrics, []);
  const newRequests = useQuery(() => listAdminRequests(["submitted", "reviewing"], ""), []);
  const working = useQuery(() => listAdminRequests(["in_progress", "assigned"], ""), []);
  const m = metrics.data;

  const attention = [
    { label: "New requests", value: newRequests.data?.length ?? 0, href: "/admin/requests", icon: Inbox },
    { label: "Payments to verify", value: m?.payments_to_verify ?? 0, href: "/admin/payments", icon: CreditCard },
    { label: "Open tickets", value: m?.open_tickets ?? 0, href: "/admin/support", icon: LifeBuoy },
    { label: "Reported issues", value: m?.open_disputes ?? 0, href: "/admin/support?tab=issues", icon: AlertTriangle },
  ];

  return (
    <>
      <PageHeader title="Overview" description="Everything that needs you, at a glance." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {attention.map((a) => (
          <Link key={a.label} href={a.href} className="rounded-2xl border bg-card p-5 transition-colors hover:border-brand/40">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{a.label}</p>
              <a.icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className={`mt-2 text-3xl font-semibold ${a.value > 0 ? "text-brand" : ""}`}>{metrics.loading ? "–" : a.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(m?.revenue ?? 0)} icon={IndianRupee} loading={metrics.loading} hint={m?.refunds ? `${formatINR(m.refunds)} refunded` : undefined} />
        <StatCard label="Completed" value={m?.completed_requests ?? 0} icon={CheckCircle2} loading={metrics.loading} hint={`${m?.active_requests ?? 0} active`} />
        <StatCard label="Students" value={m?.total_students ?? 0} icon={Users} loading={metrics.loading} hint={`${m?.repeat_customers ?? 0} repeat`} />
        <StatCard label="Avg. order" value={formatINR(m?.average_order_value ?? 0)} icon={Repeat} loading={metrics.loading} hint={`${m?.conversion_rate ?? 0}% of requests paid`} />
      </div>
      {metrics.error && <div className="mt-4"><ErrorState message={metrics.error} onRetry={metrics.reload} /></div>}

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">New — needs a reply</h2>
          {newRequests.loading ? <ListSkeleton rows={2} /> : !newRequests.data?.length ? (
            <EmptyState icon={Inbox} title="No new requests" description="New requests appear here and in your notifications." />
          ) : (
            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
              {newRequests.data.slice(0, 8).map((r) => <AdminRequestRowItem key={r.id} r={r} />)}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">In progress</h2>
          {working.loading ? <ListSkeleton rows={2} /> : !working.data?.length ? (
            <EmptyState icon={CheckCircle2} title="Nothing in progress" />
          ) : (
            <div className="divide-y overflow-hidden rounded-2xl border bg-card">
              {working.data
                .slice()
                .sort((a, b) => (a.deadline_at ?? "9").localeCompare(b.deadline_at ?? "9"))
                .slice(0, 8)
                .map((r) => <AdminRequestRowItem key={r.id} r={r} />)}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
