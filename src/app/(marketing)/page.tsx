import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LaunchBand } from "@/components/marketing/launch-band";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ServicesGrid } from "@/components/marketing/services-grid";
import { Testimonials } from "@/components/marketing/testimonials";
import { Trust } from "@/components/marketing/trust";
import { pricingNote } from "@/content/pricing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LaunchBand />
      <HowItWorks />

      <section id="services" className="scroll-mt-20 bg-muted/40 py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Services"
            title="One platform. Every student problem."
            description="From a single assignment to a final-year project — solved step by step and explained so you understand it."
          />
          <div className="mt-14">
            <ServicesGrid limitItems={5} limit={6} />
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              View all services <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <Trust />
      <Testimonials />

      <section className="py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading eyebrow="Pricing" title="Transparent, scope-based pricing" description={pricingNote} />
          <div className="mt-14">
            <PricingCards />
          </div>
        </div>
      </section>

      <Faq />
      <CtaBand />
    </>
  );
}
