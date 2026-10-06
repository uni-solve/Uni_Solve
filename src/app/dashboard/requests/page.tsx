"use client";

import Link from "next/link";
import { useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { GuestBanner } from "@/components/student/guest-banner";
import { RequestCard } from "@/components/student/request-card";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { listMyRequests } from "@/lib/data/student";
import { useQuery } from "@/lib/hooks/use-query";
import { cn } from "@/lib/utils";

const filters = [
  { key: "active", label: "Active", match: (s: string) => !["completed", "cancelled"].includes(s) },
  { key: "completed", label: "Completed", match: (s: string) => s === "completed" },
  { key: "cancelled", label: "Cancelled", match: (s: string) => s === "cancelled" },
  { key: "all", label: "All", match: () => true },
] as const;

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("active");
  const { data, error, loading, reload } = useQuery(() => listMyRequests(user!.id), [user?.id], Boolean(user));
  const f = filters.find((x) => x.key === filter)!;
  const rows = data?.filter((r) => f.match(r.status)) ?? [];

  return (
    <>
      <GuestBanner />
      <PageHeader
        title="My Requests"
        description="Every request has a private ID you can use to track it."
        actions={<Link href="/post" className={buttonVariants()}><Plus /> New request</Link>}
      />
      <div role="tablist" aria-label="Filter requests" className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {filters.map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={filter === x.key}
            onClick={() => setFilter(x.key)}
            className={cn("rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground", filter === x.key && "bg-background font-medium text-foreground shadow-sm")}
          >
            {x.label}
            {data && <span className="ml-1.5 text-xs opacity-60">{data.filter((r) => x.match(r.status)).length}</span>}
          </button>
        ))}
      </div>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={filter === "active" ? "No active requests" : "Nothing here yet"} action={<Link href="/post" className={buttonVariants({ variant: "outline" })}>Post Your Problem</Link>} />
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} href={`/dashboard/request?id=${r.code}`} />
          ))}
        </div>
      )}
    </>
  );
}
