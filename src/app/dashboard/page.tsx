"use client";

import Link from "next/link";
import { CheckCircle2, Inbox, Plus, Users, Wallet } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton, PageHeader, StatCard } from "@/components/app/states";
import { GuestBanner } from "@/components/student/guest-banner";
import { RequestCard } from "@/components/student/request-card";
import { buttonVariants } from "@/components/ui/button";
import { formatINR } from "@/content/pricing";
import { useAuth } from "@/lib/auth/auth-provider";
import { getStudentOverview, listMyRequests } from "@/lib/data/student";
import { useQuery } from "@/lib/hooks/use-query";

export default function StudentOverviewPage() {
  const { user, profile } = useAuth();
  const overview = useQuery(getStudentOverview, [user?.id]);
  const requests = useQuery(() => listMyRequests(user!.id), [user?.id], Boolean(user));
  const active = requests.data?.filter((r) => !["completed", "cancelled"].includes(r.status)) ?? [];

  return (
    <>
      <GuestBanner />
      <PageHeader
        title={`Hi${profile?.display_name ? `, ${profile.display_name}` : ""} 👋`}
        description="Here's what's happening with your requests."
        actions={
          <Link href="/post" className={buttonVariants()}>
            <Plus /> Post Your Problem
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active Requests" value={overview.data?.active ?? 0} icon={Inbox} loading={overview.loading} />
        <StatCard label="Completed" value={overview.data?.completed ?? 0} icon={CheckCircle2} loading={overview.loading} />
        <StatCard label="Pending Payment" value={formatINR(overview.data?.pending_payment ?? 0)} icon={Wallet} loading={overview.loading} />
        <StatCard label="Saved Experts" value={overview.data?.saved_experts ?? 0} icon={Users} loading={overview.loading} />
      </div>
      {overview.data && overview.data.credit > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          You have <strong className="text-foreground">{formatINR(overview.data.credit)}</strong> UniSolve credit to use on your next payment.
        </p>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active requests</h2>
          <Link href="/dashboard/requests" className="text-sm text-brand hover:underline">View all</Link>
        </div>
        {requests.loading ? (
          <ListSkeleton rows={2} />
        ) : requests.error ? (
          <ErrorState message={requests.error} onRetry={requests.reload} />
        ) : active.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No active requests"
            description="Stuck on something? Describe it and we'll find the right expert."
            action={<Link href="/post" className={buttonVariants()}>Post Your Problem</Link>}
          />
        ) : (
          <div className="grid gap-3">
            {active.slice(0, 5).map((r) => (
              <RequestCard key={r.id} r={r} href={`/dashboard/request?id=${r.code}`} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
