"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-provider";
import type { CreatedRequest } from "@/lib/data/requests";
import { appUrl, friendlyError, getSupabase } from "@/lib/supabase/client";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy — select and copy it manually.");
        }
      }}
    >
      {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
    </Button>
  );
}

const nextSteps = [
  "We review your requirements (usually within a few hours).",
  "You receive a confirmed quote and timeline.",
  "You pay securely by UPI — milestones for larger work.",
  "A verified expert is assigned and you work together privately.",
];

export function PostSuccess({ request, uploads }: { request: CreatedRequest; uploads: { ok: number; failed: string[] } }) {
  const { isAnonymous } = useAuth();
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "saving" | "sent">("idle");
  const [emailError, setEmailError] = useState<string>();
  const trackUrl = `/track?id=${request.code}&key=${request.tracking_token}`;

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setEmailError("Enter a valid email address");
    setEmailError(undefined);
    setEmailState("saving");
    // Converts the private guest session into a permanent account after the
    // email is confirmed — the request stays attached to it.
    const { error } = await getSupabase().auth.updateUser({ email }, { emailRedirectTo: appUrl("/auth/callback/?next=/reset-password") });
    if (error) {
      setEmailError(friendlyError(error));
      setEmailState("idle");
    } else setEmailState("sent");
  }

  return (
    <div className="mx-auto w-full max-w-xl text-center">
      <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
      <h1 className="mt-5 text-3xl font-semibold">Your request has been created.</h1>
      <p className="mt-2 text-muted-foreground">
        We&apos;ve matched it to <strong className="text-foreground">{request.classification.category_name}</strong>. Here&apos;s how to follow it.
      </p>

      <div className="mt-8 rounded-2xl border bg-card p-6 text-left">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">UniSolve Request ID</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="font-mono text-3xl font-semibold tracking-tight">{request.code}</p>
          <CopyButton value={request.code} label="Request ID" />
        </div>
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Private tracking key</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="truncate font-mono text-sm">{request.tracking_token}</p>
            <CopyButton value={request.tracking_token} label="tracking key" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Keep this safe. With your Request ID it lets you check status from any device.</p>
        </div>
      </div>

      {uploads.failed.length > 0 && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-left text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {uploads.failed.length} file{uploads.failed.length > 1 ? "s" : ""} couldn&apos;t be uploaded ({uploads.failed.join(", ")}). You can add them from your request page.
        </p>
      )}
      {uploads.ok > 0 && <p className="mt-4 text-sm text-muted-foreground">{uploads.ok} file{uploads.ok > 1 ? "s" : ""} uploaded securely.</p>}

      {isAnonymous && (
        <div className="mt-6 rounded-2xl border border-dashed p-5 text-left">
          <p className="flex items-center gap-2 font-medium">
            <Mail className="size-4 text-brand" aria-hidden /> Get updates and keep access
          </p>
          {emailState === "sent" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Check <strong className="text-foreground">{email}</strong> and confirm — then set a password to log in anywhere.
            </p>
          ) : (
            <form onSubmit={saveEmail} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
              <FormField id="guest-email" label={<span className="sr-only">Email</span>} error={emailError} className="flex-1">
                {(aria) => <Input {...aria} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </FormField>
              <Button type="submit" disabled={emailState === "saving"} className="sm:mt-[1.375rem]">
                {emailState === "saving" && <Loader2 className="animate-spin" aria-hidden />} Save
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Optional. We only use it for updates about your requests.</p>
        </div>
      )}

      <ol className="mt-8 space-y-3 text-left">
        {nextSteps.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">{i + 1}</span>
            <span className="pt-0.5 text-muted-foreground">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/dashboard/request?id=${request.code}`} className={buttonVariants({ size: "lg" })}>
          View my request
        </Link>
        <Link href={trackUrl} className={buttonVariants({ size: "lg", variant: "outline" })}>
          Tracking page
        </Link>
      </div>
    </div>
  );
}
