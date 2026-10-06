"use client";

import { useState } from "react";
import { CheckCircle2, Inbox, IndianRupee, UserPlus } from "lucide-react";
import { BarChartCard } from "@/components/admin/bar-chart-card";
import { ErrorState, PageHeader, StatCard } from "@/components/app/states";
import { formatINR } from "@/content/pricing";
import { getAdminMetrics, getCategoryBreakdown, getTimeseries } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { cn } from "@/lib/utils";

const ranges = [7, 30, 90] as const;
const shortDate = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(iso));

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState<(typeof ranges)[number]>(30);
  const series = useQuery(() => getTimeseries(days), [days]);
  const cats = useQuery(() => getCategoryBreakdown(days), [days]);
  const metrics = useQuery(getAdminMetrics, []);

  const rows = (series.data ?? []).map((d) => ({ ...d, label: shortDate(d.day) }));
  const sum = (k: "revenue" | "requests" | "completed" | "signups") => rows.reduce((s, d) => s + Number(d[k]), 0);
  const loading = series.loading;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Real figures from your database — nothing estimated."
        actions={
          <div role="tablist" aria-label="Date range" className="inline-flex gap-1 rounded-xl bg-muted p-1">
            {ranges.map((r) => (
              <button key={r} role="tab" aria-selected={days === r} onClick={() => setDays(r)} className={cn("rounded-lg px-3 py-1.5 text-sm text-muted-foreground", days === r && "bg-background font-medium text-foreground shadow-sm")}>
                {r} days
              </button>
            ))}
          </div>
        }
      />
      {series.error && <ErrorState message={series.error} onRetry={series.reload} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`Revenue · ${days}d`} value={formatINR(sum("revenue"))} icon={IndianRupee} loading={loading} />
        <StatCard label={`Requests · ${days}d`} value={sum("requests")} icon={Inbox} loading={loading} />
        <StatCard label={`Completed · ${days}d`} value={sum("completed")} icon={CheckCircle2} loading={loading} />
        <StatCard label={`New sign-ups · ${days}d`} value={sum("signups")} icon={UserPlus} loading={loading} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avg. order (all time)" value={formatINR(metrics.data?.average_order_value ?? 0)} icon={IndianRupee} loading={metrics.loading} />
        <StatCard label="Paid conversion" value={`${metrics.data?.conversion_rate ?? 0}%`} icon={CheckCircle2} loading={metrics.loading} hint="Requests with a verified payment" />
        <StatCard label="Repeat students" value={metrics.data?.repeat_customers ?? 0} icon={UserPlus} loading={metrics.loading} hint="Paid for 2+ requests" />
        <StatCard label="Refunded (all time)" value={formatINR(metrics.data?.refunds ?? 0)} icon={IndianRupee} loading={metrics.loading} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <BarChartCard title="Revenue per day" description="Verified payments, by verification date" data={rows} x="label" y="revenue" format={(v) => formatINR(v)} />
        <BarChartCard title="New requests per day" data={rows} x="label" y="requests" />
        <BarChartCard
          title="Requests by category"
          description={`Last ${days} days`}
          data={(cats.data ?? []).map((c) => ({ category: c.category, requests: Number(c.requests) }))}
          x="category"
          y="requests"
          horizontal
          height={280}
        />
        <BarChartCard
          title="Revenue by category"
          description={`Requests submitted in the last ${days} days`}
          data={(cats.data ?? []).map((c) => ({ category: c.category, revenue: Number(c.revenue) })).sort((a, b) => b.revenue - a.revenue)}
          x="category"
          y="revenue"
          format={(v) => formatINR(v)}
          horizontal
          height={280}
        />
      </div>
    </>
  );
}
