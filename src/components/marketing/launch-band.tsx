import Link from "next/link";
import { MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/site";

/**
 * Honest social proof for launch. Once real platform metrics exist (students helped,
 * requests completed, verified experts, average rating) this band renders them from
 * the database instead — numbers are never hard-coded.
 */
export function LaunchBand() {
  return (
    <section className="border-y bg-muted/40">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background">
            <MapPin className="size-5 text-brand" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-semibold">Launching in Hyderabad</p>
            <p className="text-sm text-muted-foreground">
              Join the early student community — and help shape how UniSolve works.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={routes.signup} className={buttonVariants({ variant: "navy" })}>
            Join as a student
          </Link>
          <Link href={routes.becomeExpert} className={buttonVariants({ variant: "outline" })}>
            Become an expert
          </Link>
        </div>
      </div>
    </section>
  );
}
