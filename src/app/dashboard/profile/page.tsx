"use client";

import { useEffect, useState } from "react";
import { Copy, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/states";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/content/pricing";
import { useAuth } from "@/lib/auth/auth-provider";
import { must, useQuery } from "@/lib/hooks/use-query";
import { appUrl, friendlyError, getSupabase } from "@/lib/supabase/client";

type StudentProfile = { referral_code: string; credit_balance: number; phone: string | null; institution: string | null; level: string | null };

async function load(userId: string) {
  const supabase = getSupabase();
  const [sp, refs, prefs, settings] = await Promise.all([
    supabase.from("student_profiles").select("referral_code, credit_balance, phone, institution, level").eq("user_id", userId).maybeSingle(),
    supabase.from("referrals").select("status"),
    supabase.from("notification_preferences").select("email, whatsapp").eq("user_id", userId).maybeSingle(),
    supabase.from("platform_settings").select("referral_reward, referral_enabled").single(),
  ]);
  return {
    student: must(sp) as StudentProfile | null,
    referrals: (must(refs) as { status: string }[]) ?? [],
    prefs: (prefs.data as { email: boolean; whatsapp: boolean } | null) ?? { email: true, whatsapp: false },
    settings: must(settings) as { referral_reward: number; referral_enabled: boolean },
  };
}

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border bg-card p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const { user, profile, isAnonymous, refreshProfile } = useAuth();
  const { data, reload } = useQuery(() => load(user!.id), [user?.id]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.display_name ?? "");
  }, [profile?.display_name]);
  useEffect(() => {
    setPhone(data?.student?.phone ?? "");
    setInstitution(data?.student?.institution ?? "");
  }, [data?.student]);

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setSaving(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(null);
    }
  }

  const supabase = () => getSupabase();
  const shareLink = data?.student ? appUrl(`/signup?ref=${data.student.referral_code}`) : "";
  const rewarded = data?.referrals.filter((r) => r.status === "rewarded").length ?? 0;

  return (
    <>
      <PageHeader title="Profile" description="Only share what you're comfortable with — nothing here is required." />
      <div className="grid gap-6">
        <Section id="account" title="Account">
          {isAnonymous ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run("email", async () => {
                  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
                  const { error } = await supabase().auth.updateUser({ email }, { emailRedirectTo: appUrl("/auth/callback/?next=/reset-password") });
                  if (error) throw error;
                }, "Check your inbox to confirm your email");
              }}
              className="grid max-w-md gap-3"
            >
              <p className="text-sm text-muted-foreground">You&apos;re on a private guest session. Add an email to keep your requests and log in from any device.</p>
              <FormField id="email" label="Email">
                {(aria) => <Input {...aria} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </FormField>
              <Button type="submit" className="w-fit" disabled={saving === "email"}>{saving === "email" && <Loader2 className="animate-spin" />} Save email</Button>
            </form>
          ) : (
            <div className="grid max-w-md gap-1 text-sm">
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
              <Button
                variant="link"
                className="mt-2 w-fit px-0"
                onClick={() =>
                  run("pw", async () => {
                    const { error } = await supabase().auth.resetPasswordForEmail(user!.email!, { redirectTo: appUrl("/auth/callback/?next=/reset-password") });
                    if (error) throw error;
                  }, "Password reset link sent")
                }
              >
                Change password
              </Button>
            </div>
          )}
        </Section>

        <Section title="About you" description="Your display name is shown to experts only on non-anonymous requests.">
          <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run("profile", async () => {
                if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) throw new Error("Enter a valid phone number, e.g. +919876543210");
                must(await supabase().from("profiles").update({ display_name: name.trim() || null }).eq("id", user!.id));
                must(await supabase().from("student_profiles").update({ phone: phone || null, institution: institution.trim() || null }).eq("user_id", user!.id));
                await refreshProfile();
              }, "Profile saved");
            }}
          >
            <FormField id="name" label="Display name" optional>
              {(aria) => <Input {...aria} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />}
            </FormField>
            <FormField id="phone" label="Phone" optional hint="Only used by UniSolve support. Never shown to experts.">
              {(aria) => <Input {...aria} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />}
            </FormField>
            <FormField id="institution" label="College / university" optional hint="Helps us match context. Never shown to experts.">
              {(aria) => <Input {...aria} value={institution} onChange={(e) => setInstitution(e.target.value)} />}
            </FormField>
            <Button type="submit" className="w-fit" disabled={saving === "profile"}>{saving === "profile" && <Loader2 className="animate-spin" />} Save</Button>
          </form>
        </Section>

        {data?.student && data.settings.referral_enabled && (
          <Section title="Refer a friend" description={`Refer a friend and get ${formatINR(data.settings.referral_reward)} credit when they complete their first payment.`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                <Gift className="size-5 text-brand" aria-hidden />
                <span className="font-mono text-lg font-semibold">{data.student.referral_code}</span>
              </div>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(shareLink).then(() => toast.success("Invite link copied"))}>
                <Copy /> Copy invite link
              </Button>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Invited</dt><dd className="text-xl font-semibold">{data.referrals.length}</dd></div>
              <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Rewarded</dt><dd className="text-xl font-semibold">{rewarded}</dd></div>
              <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Your credit</dt><dd className="text-xl font-semibold">{formatINR(Math.floor(data.student.credit_balance / 100))}</dd></div>
            </dl>
          </Section>
        )}

        {data && (
          <Section title="Notifications" description="In-app notifications are always on.">
            <div className="grid max-w-md gap-4">
              {(["email", "whatsapp"] as const).map((ch) => (
                <label key={ch} className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    {ch === "email" ? "Email updates" : "WhatsApp updates"}
                    {ch === "whatsapp" && <span className="block text-xs text-muted-foreground">Coming soon</span>}
                  </span>
                  <Switch
                    checked={data.prefs[ch]}
                    disabled={ch === "whatsapp"}
                    onCheckedChange={(v) =>
                      run(ch, async () => {
                        must(await supabase().from("notification_preferences").upsert({ user_id: user!.id, ...data.prefs, [ch]: Boolean(v) }));
                        reload();
                      }, "Preferences saved")
                    }
                  />
                </label>
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
