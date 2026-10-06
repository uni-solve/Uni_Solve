"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, EyeOff, Loader2, Lock, Pencil, Sparkles, Wallet } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/content/pricing";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  createRequest,
  ensureSession,
  previewRequest,
  uploadAttachment,
  type CreatedRequest,
  type Preview,
} from "@/lib/data/requests";
import {
  budgetOptions,
  categoryToWorkType,
  contactOptions,
  deadlineOptions,
  workTypes,
  type BudgetOption,
  type ContactPreference,
  type DeadlineOption,
  type WorkType,
} from "@/lib/requests/options";
import { friendlyError, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FilePicker } from "./file-picker";
import { OptionCard } from "./option-card";
import { PostSuccess } from "./post-success";

type Draft = {
  workType: WorkType | null;
  title: string;
  description: string;
  deadline: DeadlineOption | null;
  deadlineDate: string;
  budget: BudgetOption;
  budgetCustom: string;
  isAnonymous: boolean;
  contact: ContactPreference;
};

const emptyDraft: Draft = {
  workType: null,
  title: "",
  description: "",
  deadline: null,
  deadlineDate: "",
  budget: "suggest",
  budgetCustom: "",
  isAnonymous: true,
  contact: "in_app",
};

const DRAFT_KEY = "unisolve:post-draft";
const steps = ["Topic", "Details", "Files", "Deadline", "Budget", "Privacy", "Review"] as const;

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...emptyDraft, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}
function saveDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable (private mode) — drafts just won't persist */
  }
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function PostProblemWizard() {
  const params = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [uploadReport, setUploadReport] = useState<{ ok: number; failed: string[] }>({ ok: 0, failed: [] });

  // Restore a saved draft, or preselect the work type from ?category=.
  useEffect(() => {
    const saved = loadDraft();
    const fromCategory = categoryToWorkType[params.get("category") ?? ""];
    if (saved) setDraft(saved);
    else if (fromCategory) setDraft((d) => ({ ...d, workType: fromCategory }));
  }, [params]);

  useEffect(() => {
    if (!created && draft !== emptyDraft) saveDraft(draft);
  }, [draft, created]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const deadlineAt = useMemo(
    () => (draft.deadline === "custom" && draft.deadlineDate ? new Date(`${draft.deadlineDate}T23:59:00+05:30`).toISOString() : null),
    [draft.deadline, draft.deadlineDate],
  );

  function validate(i: number): boolean {
    const e: Record<string, string> = {};
    if (i === 0 && !draft.workType) e.workType = "Choose what you're working on";
    if (i === 1) {
      if (draft.title.trim().length < 3) e.title = "Add a short title (at least 3 characters)";
      if (draft.title.length > 140) e.title = "Keep the title under 140 characters";
      if (draft.description.trim().length < 20) e.description = "Tell us a bit more — at least 20 characters";
      if (draft.description.length > 8000) e.description = "Keep it under 8,000 characters (attach longer documents)";
    }
    if (i === 3) {
      if (!draft.deadline) e.deadline = "Choose a deadline";
      if (draft.deadline === "custom" && (!draft.deadlineDate || draft.deadlineDate < todayISO())) e.deadlineDate = "Pick today or a future date";
    }
    if (i === 4 && draft.budget === "custom") {
      const n = Number(draft.budgetCustom);
      if (!Number.isFinite(n) || n < 100) e.budgetCustom = "Enter an amount of at least ₹100";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function loadPreview() {
    setPreview(null);
    setPreviewError(null);
    if (!isSupabaseConfigured) return setPreviewError("Estimates are unavailable right now.");
    try {
      setPreview(
        await previewRequest({ workType: draft.workType!, title: draft.title, description: draft.description, deadline: draft.deadline!, deadlineAt }),
      );
    } catch (err) {
      setPreviewError(friendlyError(err));
    }
  }

  function next() {
    if (!validate(step)) return;
    const n = Math.min(step + 1, steps.length - 1);
    setStep(n);
    if (n === steps.length - 1) loadPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const back = () => setStep((s) => Math.max(0, s - 1));
  const goTo = (i: number) => setStep(i);

  async function submit() {
    if (!agreed) return setSubmitError("Please confirm the academic integrity statement");
    setSubmitting(true);
    setSubmitError(null);
    try {
      const session = await ensureSession();
      const budgetMin = draft.budget === "custom" ? Math.round(Number(draft.budgetCustom)) : null;
      const req = await createRequest({
        workType: draft.workType!,
        title: draft.title.trim(),
        description: draft.description.trim(),
        deadline: draft.deadline!,
        deadlineAt,
        budget: draft.budget,
        budgetMin,
        budgetMax: budgetMin,
        isAnonymous: draft.isAnonymous,
        contact: draft.contact,
      });
      // Files go up after the request exists (their path is scoped to it).
      const failed: string[] = [];
      let ok = 0;
      for (const f of files) {
        try {
          await uploadAttachment(req.id, session.user.id, f);
          ok++;
        } catch {
          failed.push(f.name);
        }
      }
      setUploadReport({ ok, failed });
      saveDraft(null);
      setCreated(req);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <PostSuccess request={created} uploads={uploadReport} />;

  const progress = ((step + 1) / steps.length) * 100;
  const workTypeLabel = workTypes.find((w) => w.value === draft.workType)?.label;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {steps.length} · <span className="text-foreground">{steps[step]}</span>
          </span>
          <span className="flex items-center gap-1">
            <Lock className="size-3" aria-hidden /> Private
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label="Form progress"
        >
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!isSupabaseConfigured && (
        <p className="mb-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          Request submission is opening soon. You can fill in the form — your draft is saved on this device.
        </p>
      )}

      <div className="min-h-[24rem]">
        {step === 0 && (
          <fieldset>
            <legend className="text-2xl font-semibold sm:text-3xl">What are you working on?</legend>
            <p className="mt-2 text-muted-foreground">Pick the closest match — we&apos;ll work out the details.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {workTypes.map((w) => (
                <OptionCard key={w.value} name="workType" value={w.value} checked={draft.workType === w.value} onChange={(v) => set("workType", v as WorkType)} label={w.label} hint={w.hint} icon={w.icon} />
              ))}
            </div>
            {errors.workType && <p role="alert" className="mt-3 text-sm text-destructive">{errors.workType}</p>}
          </fieldset>
        )}

        {step === 1 && (
          <div className="grid gap-5">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">What do you need help with?</h2>
              <p className="mt-2 text-muted-foreground">The more context you share, the better we can match you.</p>
            </div>
            <FormField id="title" label="Short title" error={errors.title} hint="e.g. “CNN accuracy stuck at 50%” or “Thesis methodology review”">
              {(aria) => <Input {...aria} value={draft.title} maxLength={140} onChange={(e) => set("title", e.target.value)} />}
            </FormField>
            <FormField
              id="description"
              label="Describe your problem"
              error={errors.description}
              hint={<span className="flex justify-between"><span>Mention subjects, tools or languages involved.</span><span>{draft.description.length}/8000</span></span>}
            >
              {(aria) => (
                <Textarea
                  {...aria}
                  rows={8}
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Tell us what you're trying to do, what you've tried already, and where you're stuck."
                  className="min-h-48"
                />
              )}
            </FormField>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Add files <span className="text-base font-normal text-muted-foreground">(optional)</span></h2>
              <p className="mt-2 text-muted-foreground">Briefs, code, error screenshots, drafts or datasets. Files stay private.</p>
            </div>
            <FilePicker files={files} onChange={setFiles} />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">Files are uploaded securely when you submit. They aren&apos;t saved in your draft.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <fieldset className="grid gap-5">
            <div>
              <legend className="text-2xl font-semibold sm:text-3xl">When do you need it by?</legend>
              <p className="mt-2 text-muted-foreground">Tighter deadlines may cost a little more.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {deadlineOptions.map((d) => (
                <OptionCard key={d.value} compact name="deadline" value={d.value} checked={draft.deadline === d.value} onChange={(v) => set("deadline", v as DeadlineOption)} label={d.label} />
              ))}
            </div>
            {errors.deadline && <p role="alert" className="text-sm text-destructive">{errors.deadline}</p>}
            {draft.deadline === "custom" && (
              <FormField id="deadlineDate" label="Deadline date" error={errors.deadlineDate} className="max-w-xs">
                {(aria) => <Input {...aria} type="date" min={todayISO()} value={draft.deadlineDate} onChange={(e) => set("deadlineDate", e.target.value)} />}
              </FormField>
            )}
          </fieldset>
        )}

        {step === 4 && (
          <fieldset className="grid gap-5">
            <div>
              <legend className="text-2xl font-semibold sm:text-3xl">What&apos;s your budget?</legend>
              <p className="mt-2 text-muted-foreground">You&apos;ll always see the full price before paying.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {budgetOptions.map((b) => (
                <OptionCard key={b.value} compact name="budget" value={b.value} checked={draft.budget === b.value} onChange={(v) => set("budget", v as BudgetOption)} label={b.label} hint={b.hint} />
              ))}
            </div>
            {draft.budget === "custom" && (
              <FormField id="budgetCustom" label="Your budget (₹)" error={errors.budgetCustom} className="max-w-xs">
                {(aria) => <Input {...aria} type="number" inputMode="numeric" min={100} step={50} value={draft.budgetCustom} onChange={(e) => set("budgetCustom", e.target.value)} />}
              </FormField>
            )}
          </fieldset>
        )}

        {step === 5 && (
          <div className="grid gap-6">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Privacy & updates</h2>
              <p className="mt-2 text-muted-foreground">Only share what you&apos;re comfortable with.</p>
            </div>
            <label className="flex items-start gap-4 rounded-xl border bg-card p-4">
              <EyeOff className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <span className="flex-1">
                <span className="block text-sm font-medium">Keep my request anonymous</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Your expert sees your problem, not your name. Your college and student ID are never required.
                </span>
              </span>
              <Switch checked={draft.isAnonymous} onCheckedChange={(v) => set("isAnonymous", Boolean(v))} aria-label="Keep my request anonymous" />
            </label>
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium">How should we update you?</legend>
              {contactOptions.map((c) => (
                <OptionCard key={c.value} compact name="contact" value={c.value} checked={draft.contact === c.value} onChange={(v) => set("contact", v as ContactPreference)} label={c.label} hint={c.hint} />
              ))}
            </fieldset>
            <p className="text-xs text-muted-foreground">Your phone number is never shown to experts.</p>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-6">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Here&apos;s what we understood</h2>
              <p className="mt-2 text-muted-foreground">Check the details, then submit. We&apos;ll confirm the final quote.</p>
            </div>

            <section aria-live="polite" className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                <Sparkles className="size-4" aria-hidden /> Recommended support
              </p>
              {!preview && !previewError && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Analysing your request…
                </div>
              )}
              {previewError && <p className="mt-3 text-sm text-muted-foreground">{previewError} We&apos;ll still review your request and send a quote.</p>}
              {preview && (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <p className="text-lg font-semibold">{preview.category_name}</p>
                    {preview.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {preview.skills.map((s) => (
                          <Badge key={s.id} variant="outline" className="bg-background">{s.name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl bg-background p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" aria-hidden /> Estimated price</p>
                    <p className="mt-1 font-semibold">{formatINR(preview.estimate.min)} – {formatINR(preview.estimate.max)}</p>
                  </div>
                  <div className="rounded-xl bg-background p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden /> Expected timeline</p>
                    <p className="mt-1 font-semibold">{preview.estimate.days === 0 ? "Same day" : `${preview.estimate.days} day${preview.estimate.days > 1 ? "s" : ""}`}</p>
                  </div>
                  <div className="rounded-xl bg-background p-3">
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="mt-1 font-semibold">{preview.estimate.uses_milestones ? "In milestones" : "Single payment"}</p>
                  </div>
                </div>
              )}
            </section>

            <dl className="divide-y rounded-2xl border">
              {[
                { label: "Working on", value: workTypeLabel, step: 0 },
                { label: "Title", value: draft.title, step: 1 },
                { label: "Details", value: <span className="line-clamp-3 whitespace-pre-line">{draft.description}</span>, step: 1 },
                { label: "Files", value: files.length ? `${files.length} file${files.length > 1 ? "s" : ""}` : "None", step: 2 },
                { label: "Deadline", value: draft.deadline === "custom" ? draft.deadlineDate : deadlineOptions.find((d) => d.value === draft.deadline)?.label, step: 3 },
                { label: "Budget", value: draft.budget === "custom" ? formatINR(Number(draft.budgetCustom)) : budgetOptions.find((b) => b.value === draft.budget)?.label, step: 4 },
                { label: "Privacy", value: `${draft.isAnonymous ? "Anonymous" : "Show my display name"} · ${contactOptions.find((c) => c.value === draft.contact)?.label}`, step: 5 },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-4 px-4 py-3">
                  <dt className="w-24 shrink-0 text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 flex-1 text-sm">{row.value}</dd>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${row.label}`} onClick={() => goTo(row.step)}>
                    <Pencil />
                  </Button>
                </div>
              ))}
            </dl>

            <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Checkbox checked={agreed} onCheckedChange={(v) => { setAgreed(Boolean(v)); setSubmitError(null); }} className="mt-0.5" />
              <span>
                I&apos;m asking for guidance and support to learn and solve this myself, in line with the{" "}
                <Link href="/legal/academic-integrity" target="_blank" className="text-foreground underline underline-offset-2">Academic Integrity Policy</Link>.
              </span>
            </label>

            {!user && (
              <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                No account needed. You&apos;ll get a private Request ID and tracking key — or{" "}
                <Link href="/login?next=/post" className="font-medium text-foreground underline underline-offset-2">log in</Link> to save it to your dashboard.
              </p>
            )}
            {submitError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{submitError}</p>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-20 z-10 mt-10 flex items-center gap-3 border-t bg-background/90 py-4 backdrop-blur lg:bottom-0">
        <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || submitting} className={cn(step === 0 && "invisible")}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex-1" />
        {step < steps.length - 1 ? (
          <Button type="button" size="lg" onClick={next}>
            {step === 2 && files.length === 0 ? "Skip" : "Continue"} <ArrowRight />
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={submit} disabled={submitting || !isSupabaseConfigured}>
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting ? (files.length ? "Submitting & uploading…" : "Submitting…") : "Submit request"}
          </Button>
        )}
      </div>
    </div>
  );
}
