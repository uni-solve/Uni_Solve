"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, LifeBuoy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { StatusBadge, type Tone } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketThread } from "@/app/dashboard/support/support-view";
import { useAuth } from "@/lib/auth/auth-provider";
import { listAdminTickets, listDisputes, resolveDispute, setTicketStatus, type DisputeRow } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ticketTone: Record<string, Tone> = { open: "info", awaiting_user: "warning", resolved: "success", closed: "muted" };
const disputeTone: Record<DisputeRow["status"], Tone> = { open: "danger", investigating: "warning", resolved_refund: "success", resolved_no_refund: "success", closed: "muted" };

function Tickets() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(listAdminTickets, []);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data?.find((t) => t.id === openId);

  if (open) {
    return (
      <div className="grid gap-4">
        <TicketThread ticket={open} me={user!.id} staff onBack={() => { setOpenId(null); reload(); }} />
        <div className="flex flex-wrap gap-2">
          {(["awaiting_user", "resolved", "closed", "open"] as const).filter((s) => s !== open.status).map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={async () => { try { await setTicketStatus(open.id, s); toast.success("Ticket updated"); reload(); } catch (e) { toast.error(friendlyError(e)); } }}>
              Mark {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.length) return <EmptyState icon={LifeBuoy} title="No tickets" />;
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {data.map((t) => (
        <li key={t.id}>
          <button onClick={() => setOpenId(t.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/50">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-muted-foreground">{t.code} · {t.topic}{t.request ? ` · #${t.request.code}` : ""}</p>
              <p className="truncate text-sm font-medium">{t.subject}</p>
              <p className="text-xs text-muted-foreground">Updated {formatDate(t.updated_at, true)}</p>
            </div>
            <StatusBadge tone={ticketTone[t.status]}>{t.status.replace("_", " ")}</StatusBadge>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Issues() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(listDisputes, []);
  const [resolving, setResolving] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve(d: DisputeRow, status: DisputeRow["status"]) {
    setBusy(true);
    try {
      await resolveDispute(d.id, user!.id, status, text.trim() || "Resolved");
      toast.success("Issue updated");
      setResolving(null);
      setText("");
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.length) return <EmptyState icon={AlertTriangle} title="No reported issues" />;
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {data.map((d) => (
        <li key={d.id} className="px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {d.request && <Link href={`/admin/request?id=${d.request.code}`} className="font-mono hover:underline">#{d.request.code}</Link>} · {d.reason} · {formatDate(d.created_at, true)}
              </p>
              <p className="mt-1 text-sm">{d.details}</p>
              {d.resolution && <p className="mt-1 text-xs text-muted-foreground">Resolution: {d.resolution}</p>}
            </div>
            <StatusBadge tone={disputeTone[d.status]}>{d.status.replaceAll("_", " ")}</StatusBadge>
          </div>
          {["open", "investigating"].includes(d.status) &&
            (resolving === d.id ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Resolution note" aria-label="Resolution note" />
                <Button size="sm" className="h-10" disabled={busy} onClick={() => resolve(d, "resolved_no_refund")}>{busy && <Loader2 className="animate-spin" />} Resolve</Button>
                <Button size="sm" variant="outline" className="h-10" disabled={busy} onClick={() => resolve(d, "resolved_refund")}>Resolved with refund</Button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                {d.status === "open" && <Button size="sm" variant="outline" onClick={() => resolve(d, "investigating")}>Investigating</Button>}
                <Button size="sm" onClick={() => setResolving(d.id)}>Resolve…</Button>
              </div>
            ))}
        </li>
      ))}
    </ul>
  );
}

export function AdminSupport() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "issues" ? "issues" : "tickets");
  return (
    <>
      <PageHeader title="Support" description="Tickets from students and issues reported on requests." />
      <div role="tablist" aria-label="Support" className="mb-4 inline-flex gap-1 rounded-xl bg-muted p-1">
        {[
          { k: "tickets", l: "Tickets" },
          { k: "issues", l: "Reported issues" },
        ].map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={cn("rounded-lg px-3 py-1.5 text-sm text-muted-foreground", tab === t.k && "bg-background font-medium text-foreground shadow-sm")}>
            {t.l}
          </button>
        ))}
      </div>
      {tab === "tickets" ? <Tickets /> : <Issues />}
    </>
  );
}
