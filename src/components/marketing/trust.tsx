import { Activity, BadgeCheck, CreditCard, LifeBuoy, Lock, ReceiptText } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "./section-heading";

// Each claim maps to a feature the platform actually implements.
const pillars = [
  { icon: Lock, title: "Private by Design", body: "Your requests and files are handled privately — stored in private storage, shared only with your assigned expert." },
  { icon: BadgeCheck, title: "Verified Experts", body: "Experts are reviewed and identity-verified before they can accept paid work." },
  { icon: CreditCard, title: "Secure Payments", body: "Pay by UPI; every payment is verified before work starts, with milestones for larger projects." },
  { icon: Activity, title: "Transparent Progress", body: "Track your request from submission to completion with a clear timeline." },
  { icon: LifeBuoy, title: "Human Support", body: "Raise a ticket or report an issue from any request when something goes wrong." },
  { icon: ReceiptText, title: "No Hidden Charges", body: "You see the full price before you pay. Nothing is added later." },
];

export function Trust() {
  return (
    <section className="bg-navy py-20 text-navy-foreground sm:py-28 dark:bg-card">
      <div className="container-page">
        <SectionHeading
          eyebrow="Trust"
          title="Why students trust UniSolve"
          description={<span className="text-navy-foreground/70">Built around privacy, verification and transparency.</span>}
        />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 80} className="bg-navy p-7 dark:bg-card">
              <Icon className="size-5 text-brand" aria-hidden />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-navy-foreground/65">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
