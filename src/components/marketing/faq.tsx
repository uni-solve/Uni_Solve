import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/content/faq";
import { SectionHeading } from "./section-heading";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title="Questions, answered"
          description="Can't find what you're looking for? Raise a ticket from the Help Center."
        />
        <Accordion className="rounded-2xl border bg-card px-5">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="py-4 text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="pb-4 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </section>
  );
}
