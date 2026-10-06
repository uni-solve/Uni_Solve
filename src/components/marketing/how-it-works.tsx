import { Reveal } from "@/components/reveal";
import { SectionHeading } from "./section-heading";

const steps = [
  { n: "01", title: "Tell Us", body: "Describe what you're working on and where you're stuck." },
  { n: "02", title: "Get Matched", body: "UniSolve identifies the appropriate category and expert." },
  { n: "03", title: "Work Together", body: "Communicate privately, share files and track progress." },
  { n: "04", title: "Solve It", body: "Receive guidance, technical support, revisions and preparation." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title="From stuck to solved in four steps"
          description="You don't need to know which service you need. Describe the problem — we'll route it."
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
