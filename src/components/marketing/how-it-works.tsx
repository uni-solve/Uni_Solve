import { Reveal } from "@/components/reveal";
import { SectionHeading } from "./section-heading";

const steps = [
  { n: "01", title: "Upload", body: "Send your assignment or project files, your budget and deadline." },
  { n: "02", title: "Get a Price", body: "Tell us your budget — we accept it or send a fair quote." },
  { n: "03", title: "We Solve It", body: "Pay 50% to start. We solve it step by step and keep you posted in chat." },
  { n: "04", title: "Learn It", body: "Get the full solution with explanations, plus a walkthrough of every step." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title="From assignment to understood in four steps"
          description="No forms to figure out. Send it, set your price, and we take it from there."
        />
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 90} className="relative rounded-2xl border bg-card p-6">
              <span className="font-mono text-sm font-medium text-brand">{step.n}</span>
              <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
