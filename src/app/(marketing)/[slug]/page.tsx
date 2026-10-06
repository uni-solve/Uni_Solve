import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, MessageSquareQuote } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { buttonVariants } from "@/components/ui/button";
import { getSeoPage, seoPages } from "@/content/seo-pages";
import { routes } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return seoPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getSeoPage((await params).slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/${page.slug}/` },
    openGraph: { title: page.metaTitle, description: page.metaDescription },
  };
}

export default async function SeoLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getSeoPage((await params).slug);
  if (!page) notFound();

  const related = seoPages.filter((p) => p.slug !== page.slug).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
        <div className="container-page py-16 sm:py-24">
          <p className="text-sm font-semibold text-brand">{page.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold sm:text-5xl">{page.h1}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{page.intro}</p>
          <Link href={`${routes.postProblem}?category=${page.category}`} className={`${buttonVariants({ size: "lg" })} mt-8`}>
            Post Your Problem <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="border-y bg-muted/40 py-16">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">What we can help with</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.helpWith.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Students come to us with</h2>
            <ul className="mt-6 space-y-3">
              {page.examples.map((e) => (
                <li key={e} className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
                  <MessageSquareQuote className="size-4 shrink-0 text-brand" aria-hidden />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <HowItWorks />

      <section className="pb-16">
        <div className="container-page">
          <p className="text-sm text-muted-foreground">
            All support follows our{" "}
            <Link href="/legal/academic-integrity" className="text-foreground underline underline-offset-2">
              Academic Integrity Policy
            </Link>
            : we help you learn and solve problems — the work you submit stays your own.
          </p>
          <h2 className="mt-10 text-lg font-semibold">Related help</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/${r.slug}`} className="inline-block rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
                  {r.eyebrow}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
