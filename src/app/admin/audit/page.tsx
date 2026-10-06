"use client";

import { History } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { listAudit } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";

export default function AdminAuditPage() {
  const { data, error, loading, reload } = useQuery(listAudit, []);
  return (
    <>
      <PageHeader title="Audit log" description="Every privileged or money-related action, newest first. Entries can't be edited." />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={History} title="No entries yet" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(a.created_at, true)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-2.5 text-xs">{a.entity_type} <span className="font-mono text-muted-foreground">{a.entity_id?.slice(0, 12)}</span></td>
                  <td className="max-w-md px-4 py-2.5 font-mono text-[11px] break-all text-muted-foreground">
                    {a.action === "settings.update" ? "Settings changed" : JSON.stringify(a.details)}
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
