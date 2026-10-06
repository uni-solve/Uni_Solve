import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
      <Heading className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</Heading>
      {description && <p className="mt-4 text-base text-muted-foreground sm:text-lg">{description}</p>}
    </div>
  );
}
