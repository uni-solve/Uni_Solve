"use client";

import { Bookmark, BookmarkCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { Stars } from "@/components/student/review-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { must, useQuery } from "@/lib/hooks/use-query";
import { friendlyError, getSupabase } from "@/lib/supabase/client";

type ExpertRow = { user_id: string; display_name: string; headline: string | null; rating_avg: number; rating_count: number; completed_count: number };

async function loadExperts(userId: string) {
  const supabase = getSupabase();
  const reqs = must(await supabase.from("requests").select("assigned_expert_id").eq("student_id", userId).not("assigned_expert_id", "is", null)) as { assigned_expert_id: string }[];
  const saved = must(await supabase.from("saved_experts").select("expert_id").eq("student_id", userId)) as { expert_id: string }[];
  const ids = [...new Set([...reqs.map((r) => r.assigned_expert_id), ...saved.map((s) => s.expert_id)])];
  if (!ids.length) return { experts: [] as ExpertRow[], saved: new Set<string>() };
  const experts = must(
    await supabase.from("expert_profiles").select("user_id, display_name, headline, rating_avg, rating_count, completed_count").in("user_id", ids),
  ) as ExpertRow[];
  return { experts, saved: new Set(saved.map((s) => s.expert_id)) };
}

export default function ExpertsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(() => loadExperts(user!.id), [user?.id]);

  async function toggle(expertId: string, isSaved: boolean) {
    const supabase = getSupabase();
    const res = isSaved
      ? await supabase.from("saved_experts").delete().eq("student_id", user!.id).eq("expert_id", expertId)
      : await supabase.from("saved_experts").insert({ student_id: user!.id, expert_id: expertId });
    if (res.error) toast.error(friendlyError(res.error));
    else reload();
  }

  return (
    <>
      <PageHeader title="Experts" description="Experts you've worked with. Save them to request them again." />
      {loading ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.experts.length ? (
        <EmptyState icon={Users} title="No experts yet" description="Once an expert is assigned to one of your requests, they'll appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.experts.map((e) => {
            const isSaved = data.saved.has(e.user_id);
            return (
              <div key={e.user_id} className="flex items-start gap-3 rounded-2xl border bg-card p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-accent-foreground">
                  {e.display_name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.display_name}</p>
                  {e.headline && <p className="text-sm text-muted-foreground">{e.headline}</p>}
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {e.rating_count > 0 ? <><Stars value={Math.round(e.rating_avg)} /> {Number(e.rating_avg).toFixed(1)} ({e.rating_count})</> : "New expert"}
                    <span>· {e.completed_count} completed</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={isSaved ? "Remove from saved" : "Save expert"} aria-pressed={isSaved} onClick={() => toggle(e.user_id, isSaved)}>
                  {isSaved ? <BookmarkCheck className="text-brand" /> : <Bookmark />}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
