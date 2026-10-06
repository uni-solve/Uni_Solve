import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatINR, pricingPlans } from "@/content/pricing";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {pricingPlans.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative flex flex-col rounded-2xl border bg-card p-6",
            plan.featured && "border-brand shadow-lg shadow-brand/10 ring-1 ring-brand",
          )}
        >
          {plan.featured && (
            <span className="absolute -top-2.5 left-6 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-medium text-brand-foreground">
              Most requested
            </span>
          )}
          <h3 className="font-semibold">{plan.name}</h3>
          <p className="mt-4 text-sm text-muted-foreground">Starting from</p>
          <p className="text-3xl font-semibold tracking-tight">{formatINR(plan.from)}</p>
          <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {plan.includes.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={routes.postProblem}
            className={cn(buttonVariants({ variant: plan.featured ? "default" : "outline" }), "mt-6 w-full")}
          >
            Get a quote
          </Link>
        </div>
      ))}
    </div>
  );
}
