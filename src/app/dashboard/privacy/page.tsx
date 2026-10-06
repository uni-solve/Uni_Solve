"use client";

import Link from "next/link";
import { useState } from "react";
import { EyeOff, FileX2, Loader2, ShieldCheck, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { createTicket } from "@/lib/data/support";
import { friendlyError } from "@/lib/supabase/client";

export default function PrivacyPage() {
  const [busy, setBusy] = useState<string | null>(null);

  async function request(kind: "export" | "delete") {
    setBusy(kind);
    try {
      const t = await createTicket(
        "other",
        kind === "export" ? "Data access request" : "Account deletion request",
        kind === "export" ? "Please send me a copy of the personal data UniSolve holds about me." : "Please delete my UniSolve account and personal data.",
      );
      toast.success(`Request ${t.code} created — we'll follow up in Support`);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  const items = [
    { icon: EyeOff, title: "Minimal details", body: "Your college, student ID and full name are never required." },
    { icon: ShieldCheck, title: "Private files", body: "Files are stored privately and opened only via links that expire in minutes." },
    { icon: FileX2, title: "Delete anytime", body: "Remove files you uploaded at any time from Files or the request page." },
  ];

  return (
    <>
      <PageHeader title="Privacy" description="You control what you share. Read our Privacy Policy for the full details." />
      <div className="grid gap-6">
        <section className="grid gap-3 sm:grid-cols-3">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <Icon className="size-5 text-brand" aria-hidden />
              <p className="mt-3 text-sm font-medium">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">Your data</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard/files" className={buttonVariants({ variant: "outline" })}>
              <Trash2 /> Manage & delete files
            </Link>
            <Button variant="outline" onClick={() => request("export")} disabled={busy !== null}>
              {busy === "export" && <Loader2 className="animate-spin" />} Request a copy of my data
            </Button>
            <Button variant="destructive" onClick={() => confirm("Request permanent deletion of your account?") && request("delete")} disabled={busy !== null}>
              {busy === "delete" ? <Loader2 className="animate-spin" /> : <UserX />} Delete my account
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Some records (like payments) are kept as long as the law requires. See the{" "}
            <Link href="/legal/privacy-policy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
