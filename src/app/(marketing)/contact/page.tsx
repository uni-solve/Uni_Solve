import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, Mail, MapPin } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with UniSolve through the Help Center.",
  alternates: { canonical: "/contact/" },
};

export default function ContactPage() {
  return (
    <div className="container-page py-16 sm:py-24">
      <SectionHeading as="h1" eyebrow="Contact" title="Get in touch" description="The fastest way to reach us is a support ticket." />
      <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <LifeBuoy className="size-5 text-brand" aria-hidden />
          <h2 className="mt-4 font-semibold">Support tickets</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Payments, requests, refunds or technical issues.</p>
          <Link href="/help" className={`${buttonVariants({ variant: "outline" })} mt-5`}>
            Open Help Center
          </Link>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <MapPin className="size-5 text-brand" aria-hidden />
          <h2 className="mt-4 font-semibold">Where we are</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Hyderabad, Telangana, India. Support is delivered online.</p>
          {siteConfig.supportEmail && (
            <a href={`mailto:${siteConfig.supportEmail}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
              <Mail className="size-4" aria-hidden /> {siteConfig.supportEmail}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
