"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, LifeBuoy, Loader2, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { FormField } from "@/components/form-field";
import { StatusBadge, type Tone } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-provider";
import { must, useQuery } from "@/lib/hooks/use-query";
import { createTicket, listTicketMessages, listTickets, replyToTicket, ticketTopics, type Ticket } from "@/lib/data/support";
import { formatDate } from "@/lib/requests/status";
import { friendlyError, getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ticketMeta: Record<Ticket["status"], { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "info" },
  awaiting_user: { label: "Awaiting your reply", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "muted" },
};

const topicFromLabel = (label: string | null) =>
  ticketTopics.find((t) => t.label.toLowerCase() === label?.toLowerCase())?.value ?? "other";

function NewTicket({ onCreated, onCancel }: { onCreated: (t: { id: string; code: string }) => void; onCancel: () => void }) {
  const params = useSearchParams();
  const [topic, setTopic] = useState<string>(params.get("topic") ? topicFromLabel(params.get("topic")) : params.get("request") ? "expert" : "chat");
  const [subject, setSubject] = useState(params.get("request") ? `Help with request ${params.get("request")}` : "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) return setError("Add a short subject");
    if (!body.trim()) return setError("Describe how we can help");
    setBusy(true);
    setError(undefined);
    try {
      let requestId: string | null = null;
      const code = params.get("request");
      if (code) {
        const r = must(await getSupabase().from("requests").select("id").eq("code", code).maybeSingle()) as { id: string } | null;
        requestId = r?.id ?? null;
      }
      const t = await createTicket(topic, subject.trim(), body.trim(), requestId);
      toast.success(`Ticket ${t.code} created`);
      onCreated(t);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border bg-card p-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">What do you need help with?</legend>
        <div className="flex flex-wrap gap-2">
          {ticketTopics.map((t) => (
            <label key={t.value} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", topic === t.value && "border-brand bg-brand-soft text-accent-foreground")}>
              <input type="radio" name="topic" value={t.value} checked={topic === t.value} onChange={() => setTopic(t.value)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField id="subject" label="Subject">
        {(aria) => <Input {...aria} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} />}
      </FormField>
      <FormField id="body" label="Message" error={error}>
        {(aria) => <Textarea {...aria} rows={5} value={body} onChange={(e) => setBody(e.target.value)} />}
      </FormField>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Raise ticket</Button>
      </div>
    </form>
  );
}

export function TicketThread({ ticket, me, staff = false, onBack }: { ticket: Pick<Ticket, "id" | "code" | "subject" | "status">; me: string; staff?: boolean; onBack: () => void }) {
  const { data, loading, reload } = useQuery(() => listTicketMessages(ticket.id), [ticket.id]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = ticket.status === "closed";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await replyToTicket(ticket.id, me, reply.trim(), staff);
      setReply("");
      reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All tickets
      </button>
      <div className="mt-4 rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{ticket.code}</p>
            <p className="font-medium">{ticket.subject}</p>
          </div>
          <StatusBadge tone={ticketMeta[ticket.status].tone}>{ticketMeta[ticket.status].label}</StatusBadge>
        </div>
        <ul className="space-y-4 px-5 py-5">
          {loading && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />}
          {data?.map((m) => (
            <li key={m.id} className={cn("flex flex-col gap-1", m.is_staff === staff ? "items-end" : "items-start")}>
              <span className="text-[11px] text-muted-foreground">{m.is_staff ? "UniSolve Support" : staff ? "User" : "You"} · {formatDate(m.created_at, true)}</span>
              <p className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap", m.is_staff === staff ? "bg-brand text-brand-foreground" : "bg-muted")}>{m.body}</p>
            </li>
          ))}
        </ul>
        {!closed && (
          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={1} placeholder="Write a reply…" aria-label="Reply" className="min-h-10 flex-1 resize-none" />
            <Button type="submit" size="icon" aria-label="Send" disabled={busy || !reply.trim()}>{busy ? <Loader2 className="animate-spin" /> : <Send />}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function SupportView() {
  const params = useSearchParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useQuery(listTickets, []);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("topic") || params.get("request")) setCreating(true);
  }, [params]);

  const open = data?.find((t) => t.id === openId);

  return (
    <>
      <PageHeader
        title="Support"
        description="Raise a ticket and our team will respond here. Every ticket gets an ID like SUP-10291."
        actions={!creating && !open && <Button onClick={() => setCreating(true)}><Plus /> New ticket</Button>}
      />
      {creating ? (
        <NewTicket
          onCancel={() => setCreating(false)}
          onCreated={(t) => {
            setCreating(false);
            reload().then(() => setOpenId(t.id));
          }}
        />
      ) : open ? (
        <TicketThread ticket={open} me={user!.id} onBack={() => setOpenId(null)} />
      ) : loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={LifeBuoy} title="No tickets" description="Payment, request, refund or technical problem? We're here to help." action={<Button onClick={() => setCreating(true)}>Raise a ticket</Button>} />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {data.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpenId(t.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground">{t.code}{t.request ? ` · #${t.request.code}` : ""}</p>
                  <p className="truncate text-sm font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">Updated {formatDate(t.updated_at, true)}</p>
                </div>
                <StatusBadge tone={ticketMeta[t.status].tone}>{ticketMeta[t.status].label}</StatusBadge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
