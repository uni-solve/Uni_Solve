"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { SectionHeading } from "./section-heading";

type Review = { id: string; rating: number; comment: string };

/**
 * Real testimonials only: published reviews from completed requests whose
 * students allowed public display. Renders nothing until at least one exists.
 */
export function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSupabase()
      .from("reviews")
      .select("id, rating, comment")
      .eq("status", "published")
      .eq("allow_public", true)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews((data as Review[] | null) ?? []));
  }, []);

  if (!reviews.length) return null;

  return (
    <section className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading eyebrow="Reviews" title="What students say" description="Verified reviews from completed requests." />
        <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-2xl border bg-card p-6">
              <span className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={i <= r.rating ? "size-4 fill-warning text-warning" : "size-4 text-border"} aria-hidden />
                ))}
              </span>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed">“{r.comment}”</blockquote>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="size-3.5 text-success" aria-hidden /> Verified Student
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
