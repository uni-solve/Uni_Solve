import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

export function CtaBand({
  title = "Stuck on something? Let's solve it.",
  body = "Describe your problem in a few sentences. It takes less than two minutes.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="pb-20 sm:pb-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border bg-brand-soft px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{body}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={routes.postProblem} className={buttonVariants({ size: "lg" })}>
              Post Your Problem <ArrowRight />
            </Link>
            <Link href="/pricing" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-background")}>
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
