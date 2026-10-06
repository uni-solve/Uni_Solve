import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible radio rendered as a tappable card. Group them inside a <fieldset>. */
export function OptionCard({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
  icon: Icon,
  compact = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors",
        "hover:border-foreground/20 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        checked && "border-brand bg-brand-soft/60 ring-1 ring-brand hover:border-brand",
        compact && "p-3",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
      {Icon && (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted", checked && "bg-brand text-brand-foreground")}>
          <Icon className="size-4" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {checked && <Check className="size-4 shrink-0 text-brand" aria-hidden />}
    </label>
  );
}
