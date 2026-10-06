"use client";

import { useState } from "react";
import { Loader2, Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/app/states";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/content/pricing";
import { listCoupons, saveCoupon, type Coupon } from "@/lib/data/admin";
import { useQuery } from "@/lib/hooks/use-query";
import { formatDate } from "@/lib/requests/status";
import { friendlyError } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Form = {
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  max_discount: string;
  min_order: string;
  expires: string;
  usage_limit: string;
  per_user_limit: string;
  first_order_only: boolean;
};

const blank: Form = { code: "", description: "", discount_type: "fixed", discount_value: "", max_discount: "", min_order: "0", expires: "", usage_limit: "", per_user_limit: "1", first_order_only: false };

function describe(c: Coupon) {
  const off = c.discount_type === "percent" ? `${c.discount_value}% off${c.max_discount ? ` (max ${formatINR(c.max_discount)})` : ""}` : `${formatINR(c.discount_value)} off`;
  return [off, c.min_order ? `min ${formatINR(c.min_order)}` : null, c.first_order_only ? "first order" : null].filter(Boolean).join(" · ");
}

export default function AdminCouponsPage() {
  const { data, error, loading, reload } = useQuery(listCoupons, []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function create() {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return toast.error("Code: 3–20 letters or numbers, e.g. FIRST100");
    if (!value || value < 1 || (form.discount_type === "percent" && value > 100)) return toast.error("Enter a valid discount");
    setBusy(true);
    try {
      await saveCoupon({
        code,
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Math.round(value),
        max_discount: form.max_discount ? Math.round(Number(form.max_discount)) : null,
        min_order: Math.round(Number(form.min_order) || 0),
        expires_at: form.expires ? new Date(`${form.expires}T23:59:00+05:30`).toISOString() : null,
        usage_limit: form.usage_limit ? Math.round(Number(form.usage_limit)) : null,
        per_user_limit: Math.max(1, Math.round(Number(form.per_user_limit) || 1)),
        first_order_only: form.first_order_only,
      });
      toast.success(`Coupon ${code} created`);
      setOpen(false);
      setForm(blank);
      reload();
    } catch (e) {
      toast.error(/duplicate/i.test(String((e as Error).message)) ? "That code already exists" : friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Coupons" description="Students apply coupons on their quote before paying." actions={<Button onClick={() => setOpen(true)}><Plus /> New coupon</Button>} />
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={TicketPercent} title="No coupons yet" description="Try FIRST100 — ₹100 off a student's first order." action={<Button onClick={() => setOpen(true)}>Create a coupon</Button>} />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {data.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-semibold">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {describe(c)} · used {c.used}{c.usage_limit ? `/${c.usage_limit}` : ""} · {c.expires_at ? `expires ${formatDate(c.expires_at)}` : "no expiry"}
                  </p>
                </div>
                {expired && <StatusBadge tone="muted">Expired</StatusBadge>}
                <label className="flex items-center gap-2 text-sm">
                  Active
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={async (v) => {
                      try {
                        await saveCoupon({ id: c.id, code: c.code, is_active: Boolean(v) });
                        reload();
                      } catch (e) {
                        toast.error(friendlyError(e));
                      }
                    }}
                    aria-label={`Toggle ${c.code}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New coupon</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FormField id="c-code" label="Code">{(a) => <Input {...a} className="font-mono uppercase" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="FIRST100" />}</FormField>
            <div className="flex gap-2">
              {(["fixed", "percent"] as const).map((t) => (
                <button key={t} type="button" onClick={() => set("discount_type", t)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm", form.discount_type === t && "border-brand bg-brand-soft font-medium")}>
                  {t === "fixed" ? "₹ amount off" : "% off"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="c-val" label={form.discount_type === "fixed" ? "Amount (₹)" : "Percent"}>{(a) => <Input {...a} type="number" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />}</FormField>
              {form.discount_type === "percent" && <FormField id="c-max" label="Max discount (₹)" optional>{(a) => <Input {...a} type="number" value={form.max_discount} onChange={(e) => set("max_discount", e.target.value)} />}</FormField>}
              <FormField id="c-min" label="Min order (₹)">{(a) => <Input {...a} type="number" value={form.min_order} onChange={(e) => set("min_order", e.target.value)} />}</FormField>
              <FormField id="c-exp" label="Expires" optional>{(a) => <Input {...a} type="date" value={form.expires} onChange={(e) => set("expires", e.target.value)} />}</FormField>
              <FormField id="c-limit" label="Total uses" optional>{(a) => <Input {...a} type="number" value={form.usage_limit} onChange={(e) => set("usage_limit", e.target.value)} />}</FormField>
              <FormField id="c-per" label="Uses per student">{(a) => <Input {...a} type="number" value={form.per_user_limit} onChange={(e) => set("per_user_limit", e.target.value)} />}</FormField>
            </div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.first_order_only} onCheckedChange={(v) => set("first_order_only", Boolean(v))} /> First order only</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
