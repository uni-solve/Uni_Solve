import type { Metadata } from "next";
import { EyeOff, FileLock2, Hash, MessageSquare, Milestone, Star } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SectionHeading } from "@/components/marketing/section-heading";

export const metadata: Metadata = {
  title: "For Students",
  description:
    "Post your problem privately, get personal help from the UniSolve team, and track progress from your dashboard. Built for college and university students.",
  alternates: { canonical: "/for-students/" },
};

const features = [
  { icon: EyeOff, title: "Stay private", body: "No need to share your college, student ID or full name. Post requests privately." },
  { icon: Hash, title: "Track by Request ID", body: "Every request gets a unique ID like US-48291 so you can follow its progress." },
  { icon: MessageSquare, title: "Private chat", body: "Message the UniSolve team, share code snippets and files — your phone number stays hidden." },
  { icon: FileLock2, title: "Secure files", body: "Uploads live in private storage and open only through short-lived, authorised links." },
  { icon: Milestone, title: "Pay in two parts", body: "50% to start, 50% when your solution is delivered. No hidden charges." },
  { icon: Star, title: "Your feedback counts", body: "Rate every completed request. Reviews come only from students with completed requests." },
];

export default function ForStudentsPage() {
  return (
    <>
      <section className="container-page py-16 sm:py-24">
        <SectionHeading
          as="h1"
          eyebrow="For students"
          title="Help that respects your privacy and your learning"
          description="Whether it's a bug at midnight or a thesis chapter, describe the problem once — we take it from there."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <Icon className="size-5 text-brand" aria-hidden />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="border-t">
        <HowItWorks />
      </div>
      <CtaBand />
    </>
  );
}
