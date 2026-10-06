import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

// Temporary hero — the full homepage is built in Phase 2.
export default function HomePage() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="container-page py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold sm:text-6xl">Stuck on something?</h1>
        <p className="mt-4 text-xl font-medium sm:text-2xl text-muted-foreground">Your Problem. Our Expertise.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={routes.postProblem} className={buttonVariants({ size: "lg" })}>
            Post Your Problem <ArrowRight />
          </Link>
          <Link href="/styleguide" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            View design system
          </Link>
        </div>
      </div>
    </section>
  );
}
