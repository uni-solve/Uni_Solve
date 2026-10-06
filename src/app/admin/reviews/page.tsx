"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { StatusBadge } from "@/components/status-indicator";
import { Stars } from "@/components/student/review-form";
import { Button } from "@/components/ui/button";
import { listReviews, setReviewStatus, type ReviewRow } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

const tone = { pending: "warning", published: "success", hidden: "muted" } as const;

export default function AdminReviewsPage() {
  const { data, error, loading, reload } = useQuery(listReviews, []);

  async function set(r: ReviewRow, status: ReviewRow["status"]) {
    try {
      await setReviewStatus(r.id, status);
      toast.success(status === "published" ? "Published on the website" : "Review hidden");
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  return (
    <>
      <PageHeader title="Reviews" description="Only reviews the student allowed to be public can be published — shown as “Verified Student”, never with a name." />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={Star} title="No reviews yet" description="Students can review after a request is completed." />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {data.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  <StatusBadge tone={tone[r.status]}>{r.status}</StatusBadge>
                  {!r.allow_public && <StatusBadge tone="muted">Private — not for website</StatusBadge>}
                </div>
                <p className="mt-2 text-sm">{r.comment ?? <span className="text-muted-foreground">No comment</span>}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.request && <Link href={`/admin/request?id=${r.request.code}`} className="font-mono hover:underline">#{r.request.code}</Link>} · {formatDate(r.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                {r.status !== "published" && r.allow_public && <Button size="sm" onClick={() => set(r, "published")}>Publish</Button>}
                {r.status !== "hidden" && <Button size="sm" variant="outline" onClick={() => set(r, "hidden")}>Hide</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
