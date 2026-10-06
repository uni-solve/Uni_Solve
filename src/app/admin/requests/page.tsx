"use client";

import { useEffect, useState } from "react";
import { Inbox, Search } from "lucide-react";
import { AdminRequestRowItem } from "@/components/admin/admin-request-row";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { Input } from "@/components/ui/input";
import { listAdminRequests } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import type { RequestStatus } from "@/lib/requests/status";
import { cn } from "@/lib/utils";

const tabs: { key: string; label: string; statuses: RequestStatus[] | null }[] = [
  { key: "new", label: "New", statuses: ["submitted", "reviewing"] },
  { key: "quoted", label: "Awaiting payment", statuses: ["quoted"] },
  { key: "working", label: "In progress", statuses: ["assigned", "in_progress"] },
  { key: "delivered", label: "Delivered", statuses: ["review"] },
  { key: "done", label: "Completed", statuses: ["completed"] },
  { key: "closed", label: "Cancelled", statuses: ["cancelled", "disputed"] },
  { key: "all", label: "All", statuses: null },
];

export default function AdminRequestsPage() {
  const [tab, setTab] = useState("new");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const current = tabs.find((t) => t.key === tab)!;
  const { data, error, loading, reload } = useQuery(() => listAdminRequests(debounced ? null : current.statuses, debounced), [tab, debounced]);

  return (
    <>
      <PageHeader title="Requests" description="Reply, quote, verify payments and deliver — all from each request's page." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="tablist" aria-label="Request status" className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key && !debounced}
              onClick={() => { setTab(t.key); setSearch(""); }}
              className={cn("rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground", tab === t.key && !debounced && "bg-background font-medium text-foreground shadow-sm")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative lg:ml-auto lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID or title" aria-label="Search requests" className="pl-9" />
        </div>
      </div>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={Inbox} title={debounced ? "No matches" : "Nothing here"} />
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {data.map((r) => <AdminRequestRowItem key={r.id} r={r} />)}
        </div>
      )}
    </>
  );
}
