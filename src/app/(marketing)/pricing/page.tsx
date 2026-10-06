import type { Metadata } from "next";
import { Info } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { SectionHeading } from "@/components/marketing/section-heading";
import { pricingNote } from "@/content/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent, scope-based pricing for student support. Quick Help from ₹199. See the full price before you pay.",
  alternates: { canonical: "/pricing/" },
};

const details = [
  { q: "How is my price calculated?", a: "We look at the complexity, scope and deadline of your request. You receive a quote with the full price before paying." },
  { q: "What are milestone payments?", a: "Larger projects are split into stages — for example 30% to start, 40% at a milestone and 30% on completion — so you pay as work progresses." },
  { q: "How do I pay?", a: "By UPI. Scan the QR code, enter your transaction reference, and our team verifies the payment before work begins." },
  { q: "Are there discounts?", a: "Look out for launch coupons, and refer friends to earn UniSolve credit." },
];

export default function PricingPage() {
  return (
    <>
      <section className="container-page py-16 sm:py-24">
        <SectionHeading
          as="h1"
          eyebrow="Pricing"
          title="Pay for the help you need — nothing more"
          description="Every request is quoted individually. Here's where each type of support starts."
        />
        <div className="mt-14">
          <PricingCards />
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Info className="size-4" aria-hidden />
          {pricingNote}
        </p>
      </section>

      <section className="border-t bg-muted/40 py-16">
        <div className="container-page grid gap-6 md:grid-cols-2">
          {details.map((d) => (
            <div key={d.q} className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">{d.q}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{d.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pt-20">
        <CtaBand title="Get a quote in minutes" body="Describe your problem and we'll suggest the right support, price and timeline." />
      </div>
    </>
  );
}
