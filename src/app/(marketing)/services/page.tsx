import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { serviceCategories } from "@/content/services";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Academic support, coding help, project mentorship, research and thesis guidance, and career preparation for college and university students.",
  alternates: { canonical: "/services/" },
};

export default function ServicesPage() {
  return (
    <>
      <section className="container-page py-16 sm:py-24">
        <SectionHeading
          as="h1"
          eyebrow="Services"
          title="Support for every kind of student problem"
          description="Not sure which one you need? You don't have to be. Post your problem and we'll route it to the right expert."
        />
        <nav aria-label="Service categories" className="mt-10 flex flex-wrap justify-center gap-2">
          {serviceCategories.map((c) => (
            <a key={c.slug} href={`#${c.slug}`} className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
              {c.title}
            </a>
          ))}
        </nav>
      </section>

      <div className="container-page space-y-6 pb-20">
        {serviceCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <section
              key={cat.slug}
              id={cat.slug}
              className="grid scroll-mt-24 gap-8 rounded-3xl border bg-card p-6 sm:p-10 md:grid-cols-[1fr_1.3fr]"
            >
              <div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-5 text-2xl font-semibold">{cat.title}</h2>
                <p className="mt-2 text-muted-foreground">{cat.summary}</p>
                <Link
                  href={`${routes.postProblem}?category=${cat.slug}`}
                  className={`${buttonVariants({ variant: "outline" })} mt-6`}
                >
                  Get help with {cat.title.split(" ")[0].toLowerCase()} <ArrowRight />
                </Link>
              </div>
              <ul className="grid content-start gap-3 sm:grid-cols-2">
                {cat.items.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm">
                    <Check className="size-4 shrink-0 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <CtaBand />
    </>
  );
}
