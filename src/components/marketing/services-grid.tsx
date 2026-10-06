import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { serviceCategories } from "@/content/services";

export function ServicesGrid({ limitItems }: { limitItems?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {serviceCategories.map((cat, i) => {
        const Icon = cat.icon;
        const items = limitItems ? cat.items.slice(0, limitItems) : cat.items;
        const more = cat.items.length - items.length;
        return (
          <Reveal key={cat.slug} delay={(i % 3) * 80}>
            <Link
              href={`/services#${cat.slug}`}
              className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <ArrowUpRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{cat.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{cat.summary}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <li key={item} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {item}
                  </li>
                ))}
                {more > 0 && <li className="px-1 py-1 text-xs text-muted-foreground">+{more} more</li>}
              </ul>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
