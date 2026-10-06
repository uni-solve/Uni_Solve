import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, IndianRupee, ShieldCheck, Target, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "For Experts",
  description:
    "Mentor students in your field. Get matched with requests that fit your skills, work on your schedule and get paid for every completed milestone.",
  alternates: { canonical: "/for-experts/" },
};

const benefits = [
  { icon: Target, title: "Requests that fit you", body: "Matching is based on your skills, subjects and availability — no bidding wars." },
  { icon: Clock, title: "Your schedule", body: "Choose the requests you accept and set your own response time." },
  { icon: IndianRupee, title: "Clear earnings", body: "See the price and your share before accepting. Track earnings and payouts in your dashboard." },
  { icon: UserRound, title: "Professional display name", body: "Use a professional display name with students. Your verified identity stays private with UniSolve." },
];

const steps = [
  { title: "Apply", body: "Share your education, skills, experience and portfolio." },
  { title: "Get verified", body: "We review your application and verify your identity." },
  { title: "Start mentoring", body: "Once approved, accept matched requests and start helping students." },
];

export default function ForExpertsPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
        <div className="container-page py-16 text-center sm:py-24">
          <p className="text-sm font-semibold text-brand">For experts</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold sm:text-5xl">Share what you know. Help students get unstuck.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Join UniSolve as a verified expert in coding, AI/ML, engineering, research, academics or careers.
          </p>
          <Link href={routes.becomeExpert} className={`${buttonVariants({ size: "lg" })} mt-8`}>
            Become a UniSolve Expert <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <Icon className="size-5 text-brand" aria-hidden />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40 py-20">
        <div className="container-page">
          <SectionHeading eyebrow="How to join" title="Three steps to your first request" />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border bg-card p-6">
                <span className="font-mono text-sm text-brand">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid gap-8 rounded-3xl border p-8 sm:p-12 md:grid-cols-[auto_1fr] md:items-center">
          <ShieldCheck className="size-10 text-brand" aria-hidden />
          <div>
            <h2 className="text-2xl font-semibold">Integrity is non-negotiable</h2>
            <p className="mt-2 text-muted-foreground">
              UniSolve experts mentor, explain, review and guide. They never complete graded work for submission, fabricate
              data or citations, impersonate students or help during exams.{" "}
              <Link href="/legal/expert-agreement" className="text-foreground underline underline-offset-2">
                Read the Expert Agreement
              </Link>
              .
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
              <BadgeCheck className="size-4 text-success" aria-hidden /> Only admin-approved experts can accept paid work.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
