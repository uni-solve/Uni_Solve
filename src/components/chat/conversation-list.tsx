"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/app/states";
import { buttonVariants } from "@/components/ui/button";
import { listConversations } from "@/lib/data/messages";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";

export function ConversationList({ basePath }: { basePath: string }) {
  const { data, error, loading, reload } = useQuery(listConversations, []);
  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.length)
    return <EmptyState icon={MessageSquare} title="No conversations yet" description="Messages with your expert and UniSolve support appear here." action={<Link href="/post" className={buttonVariants({ variant: "outline" })}>Post Your Problem</Link>} />;
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {data.map((c) => (
        <li key={c.id}>
          <Link href={`${basePath}?id=${c.code}#chat`} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-accent-foreground">
              {(c.expert?.display_name ?? "US").slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{c.title}</span>
                {c.last && <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(c.last.created_at, true)}</span>}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">#{c.code}{c.expert ? ` · ${c.expert.display_name}` : ""}</span>
              <span className="mt-1 line-clamp-1 block text-sm text-muted-foreground">
                {c.last ? (c.last.kind === "code" ? "Code snippet" : c.last.body ?? "Attachment") : "No messages yet"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
