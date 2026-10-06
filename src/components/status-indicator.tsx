import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "muted";

const dotTone: Record<Tone, string> = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
};

/** Pill with a leading dot; `pulse` marks live/in-progress states. */
export function StatusBadge({
  tone,
  children,
  pulse = false,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <Badge variant={tone} className={cn("gap-1.5", className)}>
      <span className="relative flex size-1.5">
        {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", dotTone[tone])} />}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dotTone[tone])} />
      </span>
      {children}
    </Badge>
  );
}
