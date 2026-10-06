export type PricingPlan = {
  name: string;
  from: number;
  description: string;
  includes: string[];
  featured?: boolean;
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Quick Help",
    from: 199,
    description: "A focused session for one concept, bug or question.",
    includes: ["Single topic or issue", "Private chat support", "Same-day options"],
  },
  {
    name: "Career Support",
    from: 499,
    description: "Resume, portfolio, LinkedIn and interview practice.",
    includes: ["Resume & LinkedIn review", "Mock interviews", "Actionable feedback"],
  },
  {
    name: "Project Support",
    from: 999,
    description: "Mentorship across planning, building, testing and demo.",
    includes: ["Architecture guidance", "Debugging sessions", "Pay 50% to start"],
    featured: true,
  },
  {
    name: "Research Support",
    from: 1499,
    description: "Methodology, analysis and tooling for your research.",
    includes: ["Methodology review", "Data analysis guidance", "LaTeX & citations"],
  },
  {
    name: "Thesis Mentorship",
    from: 2999,
    description: "Structured mentorship from topic selection to viva.",
    includes: ["Regular check-ins", "Chapter-level feedback", "Viva preparation"],
  },
];

export const pricingNote = "Final pricing depends on complexity, scope and deadline.";

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount,
  );
}
