import { cn } from "@/lib/utils";

/**
 * UniSolve mark: a "U" whose right stroke rises into a check —
 * the student ecosystem (Uni) resolving into a solution (Solve).
 * The indigo dot is the "solved" moment. Works standalone as the app icon.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="8" className="fill-navy dark:fill-white" />
      <path
        d="M9.5 8.5v7.25c0 3.6 2.6 6.25 6 6.25 1.9 0 3.4-.8 4.5-2.3L24 13"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-white dark:stroke-navy"
      />
      <circle cx="24" cy="8.5" r="2.25" className="fill-brand" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} title={showWordmark ? undefined : "UniSolve"} />
      {showWordmark && (
        <span className="text-[1.15rem] leading-none font-semibold tracking-tight">
          Uni<span className="text-brand">Solve</span>
        </span>
      )}
    </span>
  );
}
