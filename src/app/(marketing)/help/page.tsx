import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CreditCard, HelpCircle, LifeBuoy, RotateCcw, UserX, Wrench } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help with payments, requests, refunds or technical problems. Raise a support ticket and track it by ID.",
  alternates: { canonical: "/help/" },
};

const topics = [
  { icon: CreditCard, title: "Payment issue", body: "Payment not verified, wrong amount or a UPI problem." },
  { icon: UserX, title: "Request issue", body: "Delays, quality concerns or anything about your request." },
  { icon: RotateCcw, title: "Refund", body: "Request a refund under our Refund Policy." },
  { icon: Wrench, title: "Technical problem", body: "Uploads failing, login trouble or something broken." },
  { icon: HelpCircle, title: "Other", body: "Anything else we can help you with." },
];

export default function HelpPage() {
  return (
    <div className="container-page py-16 sm:py-24">
      <SectionHeading
        as="h1"
        eyebrow="Help Center"
        title="How can we help?"
        description="Raise a support ticket from your dashboard. Every ticket gets an ID like SUP-10291 so you can follow it up."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map(({ icon: Icon, title, body }) => (
          <Link
            key={title}
            href={`/dashboard/support?topic=${encodeURIComponent(title)}`}
            className="rounded-2xl border bg-card p-6 transition-colors hover:border-brand/40"
          >
            <Icon className="size-5 text-brand" aria-hidden />
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </Link>
        ))}
        <Link
          href="/dashboard/support"
          className="flex flex-col justify-center rounded-2xl border border-dashed bg-muted/40 p-6 hover:bg-muted"
        >
          <LifeBuoy className="size-5 text-brand" aria-hidden />
          <h2 className="mt-4 font-semibold">Chat with support</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Open a ticket and talk to our team directly.</p>
        </Link>
      </div>

      <section id="report" className="mt-16 scroll-mt-24 rounded-3xl border bg-danger-soft/50 p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="size-6 shrink-0 text-destructive" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold">Report an issue</h2>
            <p className="mt-2 text-muted-foreground">
              To report a problem with a specific request — including suspected breaches of our{" "}
              <Link href="/legal/academic-integrity" className="text-foreground underline underline-offset-2">
                Academic Responsibility Policy
              </Link>{" "}
              — open the request and choose <strong>Report Issue</strong>. For anything else, raise a ticket above.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
