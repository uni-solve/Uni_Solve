"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { StatusBadge } from "@/components/status-indicator";
import { formatINR } from "@/content/pricing";
import { useAuth } from "@/lib/auth/auth-provider";
import { listMyPayments } from "@/lib/data/student";
import { paymentMeta } from "@/lib/requests/payment-status";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";


export default function PaymentsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(() => listMyPayments(user!.id), [user?.id]);
  const paid = data?.filter((p) => p.status !== "rejected" && p.status !== "pending_verification").reduce((s, p) => s + p.amount + p.credit_applied - p.refunded_amount, 0) ?? 0;

  return (
    <>
      <PageHeader title="Payments" description="UPI payments are verified by our team before work begins." />
      {data && data.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Total paid: <strong className="text-foreground">{formatINR(paid)}</strong>
        </p>
      )}
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={Receipt} title="No payments yet" description="When you pay for a request, the receipt appears here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Request</th>
                <th className="px-4 py-2.5 font-medium">Reference</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    {p.request && <Link href={`/dashboard/request?id=${p.request.code}`} className="font-mono text-xs hover:underline">#{p.request.code}</Link>}
                    <span className="block text-xs text-muted-foreground">{p.milestone?.title}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.provider === "credit" ? "Credit" : p.provider_ref}</td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    {formatINR(p.amount + p.credit_applied)}
                    {p.refunded_amount > 0 && <span className="block text-xs text-muted-foreground">−{formatINR(p.refunded_amount)} refunded</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={paymentMeta[p.status].tone}>{paymentMeta[p.status].label}</StatusBadge>
                    {p.rejection_reason && <span className="mt-1 block text-xs text-destructive">{p.rejection_reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
