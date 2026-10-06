import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLegalDoc, legalDocs } from "@/content/legal";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export function generateStaticParams() {
  return legalDocs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = getLegalDoc((await params).slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary, alternates: { canonical: `/legal/${doc.slug}/` } };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getLegalDoc(slug);
  if (!doc) notFound();

  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Policies" className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Policies</p>
        <ul className="mt-3 flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {legalDocs.map((d) => (
            <li key={d.slug} className="shrink-0">
              <Link
                href={`/legal/${d.slug}`}
                aria-current={d.slug === slug ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  d.slug === slug && "bg-muted font-medium text-foreground",
                )}
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="max-w-3xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{doc.summary}</p>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {doc.updated}</p>
        <div className="mt-10 space-y-10">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold">{s.heading}</h2>
              {s.body.length > 2 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground marker:text-brand">
                  {s.body.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : (
                s.body.map((p) => (
                  <p key={p} className="mt-3 leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))
              )}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
