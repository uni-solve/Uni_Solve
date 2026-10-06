"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, Download, FileText, Info, Loader2, Paperclip, Send, ShieldCheck, Wallet, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getMessage, listMessages, sendFile, sendText, subscribeToMessages, type ChatMessage } from "@/lib/data/messages";
import { signedFileUrl } from "@/lib/data/requests";
import { acceptAttribute, formatBytes, validateFile } from "@/lib/requests/options";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Participants = { studentId: string; expertId: string | null; expertName?: string | null; studentAnonymous: boolean };

function senderLabel(m: ChatMessage, me: string, p: Participants) {
  if (m.sender_id === me) return "You";
  if (m.sender_id === p.expertId) return p.expertName ?? "UniSolve";
  if (m.sender_id === p.studentId) return "Student";
  return "UniSolve";
}

async function openFile(path: string, name: string) {
  try {
    const url = await signedFileUrl(path, 120, name);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    toast.error(friendlyError(err));
  }
}

function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    signedFileUrl(path, 300).then(setSrc).catch(() => {});
  }, [path]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="max-h-64 rounded-lg border object-contain" />
  ) : (
    <div className="h-32 w-48 animate-pulse rounded-lg bg-muted" />
  );
}

function Bubble({ m, mine, label }: { m: ChatMessage; mine: boolean; label: string }) {
  if (m.kind === "system" || m.kind === "payment" || m.kind === "milestone") {
    const Icon = m.kind === "payment" ? Wallet : m.kind === "milestone" ? ShieldCheck : Info;
    return (
      <li className="flex justify-center">
        <span className="inline-flex max-w-[90%] items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span>{m.body}</span>
          <time className="shrink-0 opacity-70">{formatDate(m.created_at, true)}</time>
        </span>
      </li>
    );
  }
  return (
    <li className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <span className="px-1 text-[11px] text-muted-foreground">
        {label} · {formatDate(m.created_at, true)}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
          mine ? "rounded-tr-sm bg-brand text-brand-foreground" : "rounded-tl-sm bg-muted",
          m.kind === "code" && "w-full max-w-[85%] bg-navy p-0 text-navy-foreground dark:bg-black/40",
        )}
      >
        {m.kind === "code" ? (
          <div>
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-white/60">
              <span>{m.code_language || "code"}</span>
              <button type="button" className="hover:text-white" onClick={() => navigator.clipboard.writeText(m.body ?? "")}>
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed"><code>{m.body}</code></pre>
          </div>
        ) : (
          <>
            {m.attachment && m.kind === "image" && <SignedImage path={m.attachment.storage_path} alt={m.attachment.file_name} />}
            {m.attachment && m.kind === "file" && (
              <button
                type="button"
                onClick={() => openFile(m.attachment!.storage_path, m.attachment!.file_name)}
                className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left", mine ? "border-white/25" : "bg-background")}
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.attachment.file_name}</span>
                  <span className="block text-xs opacity-70">{formatBytes(m.attachment.size_bytes)}</span>
                </span>
                <Download className="size-4 shrink-0 opacity-70" aria-hidden />
              </button>
            )}
            {m.body && <p className={cn("whitespace-pre-wrap break-words", m.attachment && "mt-2")}>{m.body}</p>}
          </>
        )}
      </div>
    </li>
  );
}

export function ChatPanel({
  requestId,
  me,
  participants,
  disabled,
  disabledReason,
  onReportIssue,
}: {
  requestId: string;
  me: string;
  participants: Participants;
  disabled?: boolean;
  disabledReason?: string;
  onReportIssue?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const [language, setLanguage] = useState("python");
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    listMessages(requestId)
      .then((m) => active && setMessages(m))
      .catch((e) => toast.error(friendlyError(e)))
      .finally(() => active && setLoading(false));
    const unsubscribe = subscribeToMessages(requestId, async (id) => {
      const msg = await getMessage(id).catch(() => null);
      if (msg && active) setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [requestId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function refresh() {
    setMessages(await listMessages(requestId));
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendText(requestId, me, body, codeMode ? language : undefined);
      setText("");
      setCodeMode(false);
      await refresh();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  async function attach(file: File | undefined) {
    if (!file) return;
    const err = validateFile(file);
    if (err) return toast.error(err);
    setSending(true);
    try {
      await sendFile(requestId, me, file, text.trim() || undefined);
      setText("");
      await refresh();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label="Private chat" className="flex h-[32rem] flex-col overflow-hidden rounded-2xl border bg-card lg:h-[38rem]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">Private chat</p>
          <p className="text-xs text-muted-foreground">Phone numbers stay hidden. Keep all communication here.</p>
        </div>
        {onReportIssue && (
          <Button variant="ghost" size="sm" onClick={onReportIssue}>
            <Flag /> Report issue
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading messages" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
        ) : (
          <ul className="space-y-4" aria-live="polite">
            {messages.map((m) => (
              <Bubble key={m.id} m={m} mine={m.sender_id === me} label={senderLabel(m, me, participants)} />
            ))}
          </ul>
        )}
        <div ref={bottom} />
      </div>

      {disabled ? (
        <p className="border-t bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">{disabledReason}</p>
      ) : (
        <form onSubmit={send} className="border-t p-3">
          {codeMode && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <label htmlFor="code-lang" className="text-muted-foreground">Language</label>
              <select
                id="code-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border bg-background px-2 py-1"
              >
                {["python", "java", "c", "cpp", "javascript", "typescript", "sql", "matlab", "r", "bash", "other"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Button type="button" variant="ghost" size="icon" aria-label="Attach a file" onClick={() => fileInput.current?.click()} disabled={sending}>
              <Paperclip />
            </Button>
            <Button
              type="button"
              variant={codeMode ? "secondary" : "ghost"}
              size="icon"
              aria-label="Code snippet"
              aria-pressed={codeMode}
              onClick={() => setCodeMode((v) => !v)}
            >
              <Code2 />
            </Button>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !codeMode) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={codeMode ? "Paste your code…" : "Write a message…"}
              aria-label="Message"
              rows={1}
              className={cn("max-h-40 min-h-10 flex-1 resize-none py-2", codeMode && "font-mono text-xs")}
            />
            <Button type="submit" size="icon" aria-label="Send" disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </div>
          <input ref={fileInput} type="file" accept={acceptAttribute} className="sr-only" aria-hidden tabIndex={-1} onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
        </form>
      )}
    </section>
  );
}
