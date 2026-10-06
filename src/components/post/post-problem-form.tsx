"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Lock, Send, Sparkles, Wallet } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { categoryToWorkType, workTypes, type DeadlineOption, type WorkType } from "@/lib/requests/options";
import { friendlyError, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FilePicker } from "./file-picker";
import { PostSuccess } from "./post-success";

type Draft = {
  workType: WorkType | null;
  title: string;
  description: string;
  amount: string;
  suggest: boolean;
  deadline: DeadlineOption | null;
  deadlineDate: string;
};

const emptyDraft: Draft = { workType: null, title: "", description: "", amount: "", suggest: false, deadline: null, deadlineDate: "" };
const DRAFT_KEY = "unisolve:post-draft-v2";

const deadlineChips: { value: DeadlineOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "2_3_days", label: "2–3 days" },
  { value: "this_week", label: "This week" },
  { value: "none", label: "No rush" },
  { value: "custom", label: "Pick a date" },
];

function todayISO() {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST date
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...emptyDraft, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable — drafts just won't persist */
  }
}

function Chip({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-full border bg-card px-3.5 py-2 text-sm transition-colors select-none hover:border-foreground/25",
        "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        checked && "border-brand bg-brand-soft font-medium text-accent-foreground hover:border-brand",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      {children}
    </label>
  );
}

export function PostProblemForm() {
  const params = useSearchParams();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | "agree", string>>>({});
  const [agreed, setAgreed] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [uploads, setUploads] = useState<{ ok: number; failed: string[] }>({ ok: 0, failed: [] });

  useEffect(() => {
    const saved = readDraft();
    const fromCategory = categoryToWorkType[params.get("category") ?? ""];
    if (saved) setDraft(saved);
    else if (fromCategory) setDraft((d) => ({ ...d, workType: fromCategory }));
  }, [params]);

  useEffect(() => {
    if (!created && draft !== emptyDraft) writeDraft(draft);
  }, [draft, created]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const deadlineAt = useMemo(
    () => (draft.deadline === "custom" && draft.deadlineDate ? new Date(`${draft.deadlineDate}T23:59:00+05:30`).toISOString() : null),
    [draft.deadline, draft.deadlineDate],
  );

  // Live estimate, debounced, once there's enough to go on.
  useEffect(() => {
    if (!isSupabaseConfigured || draft.description.trim().length < 20) return setPreview(null);
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        setPreview(
          await previewRequest({
            workType: draft.workType ?? "other",
            title: draft.title,
            description: draft.description,
            deadline: draft.deadline === "custom" && !deadlineAt ? "none" : draft.deadline ?? "none",
            deadlineAt,
          }),
        );
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [draft.workType, draft.title, draft.description, draft.deadline, deadlineAt]);

  function validate() {
    const e: typeof errors = {};
    if (!draft.workType) e.workType = "Choose what you're working on";
    if (draft.description.trim().length < 20) e.description = "Tell us a bit more — at least 20 characters";
    if (draft.description.length > 8000) e.description = "Keep it under 8,000 characters (attach longer documents)";
    if (draft.title.length > 140) e.title = "Keep the title under 140 characters";
    if (!draft.suggest) {
      const n = Number(draft.amount);
      if (!draft.amount || !Number.isFinite(n) || n < 100) e.amount = "Enter the amount you'd like to pay (at least ₹100), or tick “suggest a price”";
    }
    if (!draft.deadline) e.deadline = "Choose a deadline";
    if (draft.deadline === "custom" && (!draft.deadlineDate || draft.deadlineDate < todayISO())) e.deadlineDate = "Pick today or a future date";
    if (!agreed) e.agree = "Please confirm to continue";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(first === "agree" ? "agree" : first)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !first;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const session = await ensureSession();
      const amount = draft.suggest ? null : Math.round(Number(draft.amount));
      const description = draft.description.trim();
      const title = draft.title.trim() || description.split("\n")[0].slice(0, 80).trim();
      const req = await createRequest({
        workType: draft.workType!,
        title: title.length >= 3 ? title : `${workTypes.find((w) => w.value === draft.workType)?.label} help`,
        description,
        deadline: draft.deadline!,
        deadlineAt,
        budget: draft.suggest ? "suggest" : "custom",
        budgetMin: amount,
        budgetMax: amount,
        isAnonymous: true,
        contact: "in_app",
      });
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
      setUploads({ ok, failed });
      writeDraft(null);
      setCreated(req);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <PostSuccess request={created} uploads={uploads} />;

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div className="grid min-w-0 gap-8">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Send your assignment</h1>
          <p className="mt-2 text-muted-foreground">Attach your files, tell us what&apos;s needed, your budget and deadline. We&apos;ll reply with a price in your dashboard.</p>
        </div>

        {!isSupabaseConfigured && (
          <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">Submissions are opening soon. Your draft is saved on this device.</p>
        )}

        <fieldset id="workType">
          <legend className="mb-3 text-sm font-medium">What are you working on?</legend>
          <div className="flex flex-wrap gap-2">
            {workTypes.map((w) => (
              <Chip key={w.value} name="workType" value={w.value} checked={draft.workType === w.value} onChange={(v) => set("workType", v as WorkType)}>
                {w.label}
              </Chip>
            ))}
          </div>
          {errors.workType && <p role="alert" className="mt-2 text-sm text-destructive">{errors.workType}</p>}
        </fieldset>

        <div className="grid gap-5">
          <FormField id="description" label="What needs to be solved?" error={errors.description} hint={<span className="flex justify-between gap-4"><span>Mention the subject, which questions or parts, and any format your college wants.</span><span className="shrink-0">{draft.description.length}/8000</span></span>}>
            {(aria) => (
              <Textarea
                {...aria}
                rows={7}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="e.g. Solve questions 1–6 of the attached DBMS assignment with explanations. Due Friday."
                className="min-h-40"
              />
            )}
          </FormField>
          <FormField id="title" label="Short title" optional error={errors.title} hint="We'll use the first line of your description if you leave this empty.">
            {(aria) => <Input {...aria} value={draft.title} maxLength={140} onChange={(e) => set("title", e.target.value)} placeholder="e.g. DBMS assignment 3 — normalization" />}
          </FormField>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium">
            Files <span className="font-normal text-muted-foreground">(PDF, DOCX, PPTX, XLSX, ZIP, images, code)</span>
          </p>
          <FilePicker files={files} onChange={setFiles} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div id="amount" className="grid content-start gap-2">
            <FormField id="amount-input" label="Your budget (₹)" error={errors.amount}>
              {(aria) => (
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    {...aria}
                    type="number"
                    inputMode="numeric"
                    min={100}
                    step={50}
                    placeholder="1500"
                    disabled={draft.suggest}
                    value={draft.suggest ? "" : draft.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    className="pl-7 text-lg font-semibold"
                  />
                </div>
              )}
            </FormField>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={draft.suggest} onCheckedChange={(v) => { set("suggest", Boolean(v)); setErrors((e) => ({ ...e, amount: undefined })); }} />
              Not sure — suggest a price
            </label>
            <p className="text-xs text-muted-foreground">You pay 50% to start and 50% on delivery.</p>
          </div>

          <fieldset id="deadline" className="grid content-start gap-2">
            <legend className="mb-2 text-sm font-medium">Deadline</legend>
            <div className="flex flex-wrap gap-2">
              {deadlineChips.map((d) => (
                <Chip key={d.value} name="deadline" value={d.value} checked={draft.deadline === d.value} onChange={(v) => set("deadline", v as DeadlineOption)}>
                  {d.label}
                </Chip>
              ))}
            </div>
            {errors.deadline && <p role="alert" className="text-sm text-destructive">{errors.deadline}</p>}
            {draft.deadline === "custom" && (
              <FormField id="deadlineDate" label={<span className="sr-only">Deadline date</span>} error={errors.deadlineDate}>
                {(aria) => <Input {...aria} type="date" min={todayISO()} value={draft.deadlineDate} onChange={(e) => set("deadlineDate", e.target.value)} />}
              </FormField>
            )}
          </fieldset>
        </div>

        <div id="agree">
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Checkbox checked={agreed} onCheckedChange={(v) => { setAgreed(Boolean(v)); setErrors((e) => ({ ...e, agree: undefined })); }} className="mt-0.5" aria-invalid={errors.agree ? true : undefined} />
            <span>
              I&apos;ve read the{" "}
              <Link href="/legal/academic-integrity" target="_blank" className="text-foreground underline underline-offset-2">Academic Responsibility Policy</Link>{" "}
              and{" "}
              <Link href="/legal/terms-of-service" target="_blank" className="text-foreground underline underline-offset-2">Terms</Link>.
            </span>
          </label>
          {errors.agree && <p role="alert" className="mt-1.5 text-sm text-destructive">{errors.agree}</p>}
        </div>

        {submitError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{submitError}</p>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            {user ? "Private — only you and UniSolve can see this." : "No account needed. You'll get a private Request ID."}
          </p>
          <Button type="submit" size="lg" disabled={submitting || !isSupabaseConfigured} className="sm:min-w-44">
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            {submitting ? (files.length ? "Sending & uploading…" : "Sending…") : "Send"}
          </Button>
        </div>
      </div>

      {/* Live estimate */}
      <aside className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        <div className="rounded-2xl border border-brand/30 bg-brand-soft/40 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
            <Sparkles className="size-4" aria-hidden /> What we understood
          </p>
          {!preview ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {previewing ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> Analysing…</span>
              ) : (
                "Start describing your problem to see the category, a typical price range and timeline."
              )}
            </p>
          ) : (
            <div className={cn("mt-3 grid gap-4 transition-opacity", previewing && "opacity-60")}>
              <div>
                <p className="text-lg font-semibold">{preview.category_name}</p>
                {preview.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {preview.skills.slice(0, 6).map((s) => <Badge key={s.id} variant="outline" className="bg-background">{s.name}</Badge>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-background p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" aria-hidden /> Typical price</p>
                  <p className="mt-1 text-sm font-semibold">{formatINR(preview.estimate.min)}–{formatINR(preview.estimate.max)}</p>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden /> Timeline</p>
                  <p className="mt-1 text-sm font-semibold">{preview.estimate.days === 0 ? "Same day" : `${preview.estimate.days} day${preview.estimate.days > 1 ? "s" : ""}`}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">An estimate only. We&apos;ll accept your budget or send a quote — you always see the full price before paying.</p>
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}
