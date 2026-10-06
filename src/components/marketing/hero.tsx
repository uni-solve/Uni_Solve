import Link from "next/link";
import { ArrowRight, CreditCard, Lock, UserCheck, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";
import { HeroVisual } from "./hero-visual";

const assurances = [
  { icon: Lock, label: "Private & Confidential" },
  { icon: Zap, label: "Fast Response" },
  { icon: UserCheck, label: "Expert Support" },
  { icon: CreditCard, label: "Secure Payments" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="container-page grid items-center gap-12 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            Now launching in Hyderabad
          </p>
          <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold sm:text-6xl">
            Stuck on something?
            <span className="block text-muted-foreground">Let&apos;s solve it.</span>
          </h1>
          <p className="mt-5 text-lg font-medium text-brand">Your Problem. Our Expertise.</p>
          <p className="mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            Get private, expert support for academics, coding, projects, research and career preparation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={routes.postProblem} className={buttonVariants({ size: "lg" })}>
              Post Your Problem <ArrowRight />
            </Link>
            <Link href="/services" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Explore Services
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-muted-foreground sm:flex sm:flex-wrap">
            {assurances.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-foreground" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}
