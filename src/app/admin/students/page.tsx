"use client";

import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { StatusBadge } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/content/pricing";
import { listStudents, setSuspended } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, error, loading, reload } = useQuery(() => listStudents(q), [q]);

  return (
    <>
      <PageHeader title="Students" description="Everyone who has posted or signed up. Guests appear until they add an email." />
      <div className="relative mb-4 sm:w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or referral code" aria-label="Search students" className="pl-9" />
      </div>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="No students yet" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Student</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Requests</th>
                <th className="px-4 py-2.5 text-right font-medium">Spent</th>
                <th className="px-4 py-2.5 text-right font-medium">Credit</th>
                <th className="px-4 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.display_name ?? (s.is_guest ? "Guest" : "—")}</p>
                    <p className="text-xs text-muted-foreground">{s.email ?? "no email"}{s.phone ? ` · ${s.phone}` : ""}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{s.referral_code}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(s.joined)}</td>
                  <td className="px-4 py-3 text-right">{s.requests} <span className="text-xs text-muted-foreground">({s.completed} done)</span></td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatINR(Number(s.total_spent))}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatINR(s.credit)}</td>
                  <td className="px-4 py-3 text-right">
                    {s.is_suspended && <StatusBadge tone="danger" className="mr-2">Suspended</StatusBadge>}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(s.is_suspended ? "Restore this account?" : "Suspend this account? They won't be able to use the dashboard.")) return;
                        try {
                          await setSuspended(s.id, !s.is_suspended);
                          toast.success(s.is_suspended ? "Account restored" : "Account suspended");
                          reload();
                        } catch (e) {
                          toast.error(friendlyError(e));
                        }
                      }}
                    >
                      {s.is_suspended ? "Restore" : "Suspend"}
                    </Button>
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
