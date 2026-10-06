"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, QrCode, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/states";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getSettings, saveSettings, uploadUpiQr } from "@/lib/data/admin";
import { publicPlatformUrl } from "@/lib/data/payments";
import { useQuery } from "@/lib/hooks/use-query";
import { friendlyError, getSupabase } from "@/lib/supabase/client";
import { passwordSchema } from "@/lib/validation";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminSettingsPage() {
  const { data, reload } = useQuery(getSettings, []);
  const [upiId, setUpiId] = useState("");
  const [payee, setPayee] = useState("");
  const [reward, setReward] = useState("");
  const [threshold, setThreshold] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setUpiId(data.upi_id ?? "");
    setPayee(data.upi_payee_name ?? "");
    setReward(String(data.referral_reward));
    setThreshold(String(data.public_stats_threshold));
  }, [data]);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      reload();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  const qr = publicPlatformUrl(data?.upi_qr_path ?? null);

  return (
    <>
      <PageHeader title="Settings" description="Changes are saved to the database and recorded in the audit log." />
      <div className="grid gap-6">
        <Section title="UPI payments" description="Students see this QR and UPI ID when they pay.">
          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center gap-3">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="Current UPI QR" className="size-44 rounded-xl border bg-white object-contain p-2" />
              ) : (
                <div className="flex size-44 items-center justify-center rounded-xl border border-dashed text-muted-foreground"><QrCode className="size-8" aria-hidden /></div>
              )}
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
                {busy === "qr" ? <Loader2 className="animate-spin" /> : <Upload />} {qr ? "Replace QR" : "Upload QR"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) run("qr", () => uploadUpiQr(f), "QR updated");
                }}
              />
            </div>
            <form
              className="grid content-start gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (upiId && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())) return toast.error("UPI ID looks like name@bank");
                run("upi", () => saveSettings({ upi_id: upiId.trim() || null, upi_payee_name: payee.trim() || null }), "UPI details saved");
              }}
            >
              <FormField id="upi" label="UPI ID">{(a) => <Input {...a} value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okaxis" className="font-mono" />}</FormField>
              <FormField id="payee" label="Payee name" hint="Shown in the student's UPI app.">{(a) => <Input {...a} value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="UniSolve" />}</FormField>
              <Button type="submit" className="w-fit" disabled={busy !== null}>{busy === "upi" && <Loader2 className="animate-spin" />} Save</Button>
            </form>
          </div>
        </Section>

        <Section title="Referrals" description="Credit the referrer gets when a friend completes their first payment.">
          <div className="flex flex-wrap items-end gap-4">
            <FormField id="reward" label="Reward (₹)" className="w-32">{(a) => <Input {...a} type="number" min={0} value={reward} onChange={(e) => setReward(e.target.value)} />}</FormField>
            <label className="flex h-10 items-center gap-2 text-sm">
              <Switch checked={data?.referral_enabled ?? true} onCheckedChange={(v) => run("ref-toggle", () => saveSettings({ referral_enabled: Boolean(v) }), v ? "Referrals on" : "Referrals off")} />
              Enabled
            </label>
            <Button onClick={() => run("reward", () => saveSettings({ referral_reward: Math.max(0, Math.round(Number(reward) || 0)) }), "Reward saved")} disabled={busy !== null}>
              Save
            </Button>
          </div>
        </Section>

        <Section title="Public stats" description="The homepage shows real totals (students helped, requests completed, rating) only after this many completed requests.">
          <div className="flex items-end gap-4">
            <FormField id="threshold" label="Completed requests" className="w-40">{(a) => <Input {...a} type="number" min={1} value={threshold} onChange={(e) => setThreshold(e.target.value)} />}</FormField>
            <Button onClick={() => run("threshold", () => saveSettings({ public_stats_threshold: Math.max(1, Math.round(Number(threshold) || 25)) }), "Saved")} disabled={busy !== null}>Save</Button>
          </div>
        </Section>

        <Section title="Your password">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const check = passwordSchema.safeParse(pw);
              if (!check.success) return toast.error(check.error.issues[0].message);
              run("pw", async () => {
                const { error } = await getSupabase().auth.updateUser({ password: pw });
                if (error) throw error;
                setPw("");
              }, "Password changed");
            }}
          >
            <FormField id="new-pw" label="New password" className="sm:w-72">{(a) => <Input {...a} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}</FormField>
            <Button type="submit" disabled={busy !== null || !pw}>{busy === "pw" && <Loader2 className="animate-spin" />} Change password</Button>
          </form>
        </Section>
      </div>
    </>
  );
}
