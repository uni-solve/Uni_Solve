"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { PaymentReviewRow } from "@/components/admin/payment-review";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { listPayments } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { cn } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [pendingOnly, setPendingOnly] = useState(true);
  const { data, error, loading, reload } = useQuery(() => listPayments(pendingOnly), [pendingOnly]);

  return (
    <>
      <PageHeader title="Payments" description="Check each UTR against your UPI app or bank statement before verifying." />
      <div role="tablist" aria-label="Payments filter" className="mb-4 inline-flex gap-1 rounded-xl bg-muted p-1">
        {[
          { v: true, l: "To verify" },
          { v: false, l: "All payments" },
        ].map((t) => (
          <button
            key={t.l}
            role="tab"
            aria-selected={pendingOnly === t.v}
            onClick={() => setPendingOnly(t.v)}
            className={cn("rounded-lg px-3 py-1.5 text-sm text-muted-foreground", pendingOnly === t.v && "bg-background font-medium text-foreground shadow-sm")}
          >
            {t.l}
          </button>
        ))}
      </div>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={CreditCard} title={pendingOnly ? "No payments to verify" : "No payments yet"} />
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((p) => <PaymentReviewRow key={p.id} p={p} showRequest onChange={reload} />)}
        </div>
      )}
    </>
  );
}
