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
    description: "One question, bug or problem — solved and explained.",
    includes: ["Step-by-step solution", "Private chat", "Same-day options"],
  },
  {
    name: "Assignment Solutions",
    from: 499,
    description: "A full assignment solved, with explanations for every answer.",
    includes: ["Every question solved", "Worked explanations", "Doubt-clearing chat"],
  },
  {
    name: "Project Development",
    from: 999,
    description: "Your project built end to end, then taught to you.",
    includes: ["Complete working project", "Code walkthrough session", "Pay 50% to start"],
    featured: true,
  },
  {
    name: "Research Support",
    from: 1499,
    description: "Analysis, methodology and tools, worked through with you.",
    includes: ["Data analysis", "Methodology support", "LaTeX & citations"],
  },
  {
    name: "Thesis Support",
    from: 2999,
    description: "Support from topic selection to viva preparation.",
    includes: ["Regular check-ins", "Chapter-level support", "Viva preparation"],
  },
];

export const pricingNote = "Final pricing depends on complexity, scope and deadline.";

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount,
  );
}
