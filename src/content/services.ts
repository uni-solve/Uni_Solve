import {
  BookOpen,
  Briefcase,
  Code2,
  FlaskConical,
  GraduationCap,
  Layers,
  type LucideIcon,
} from "lucide-react";

export type ServiceCategory = {
  slug: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  items: string[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "academic",
    title: "Assignment Solutions",
    summary: "Send your assignment — get every question solved step by step, with explanations you can follow.",
    icon: BookOpen,
    items: ["Step-by-step solutions", "Numericals & problem sets", "Concept explanations", "1-on-1 doubt sessions", "Exam preparation"],
  },
  {
    slug: "coding",
    title: "Code Solutions & Debugging",
    summary: "Working code for your programs and labs, with a line-by-line walkthrough of how it works.",
    icon: Code2,
    items: [
      "Python",
      "Java",
      "C/C++",
      "JavaScript",
      "React",
      "SQL",
      "MATLAB",
      "AI/ML",
      "Data Science",
      "Cloud",
      "Cybersecurity",
    ],
  },
  {
    slug: "projects",
    title: "Project Development + Walkthrough",
    summary: "Mini, major and final-year projects built end to end — then taught to you so you can explain every part.",
    icon: Layers,
    items: [
      "Project ideation",
      "Architecture",
      "Full project development",
      "Debugging",
      "Dataset support",
      "Testing",
      "Documentation",
      "Code walkthrough session",
      "Presentation preparation",
    ],
  },
  {
    slug: "research",
    title: "Research Support",
    summary: "Analysis, methodology and tooling worked through with you, step by step.",
    icon: FlaskConical,
    items: [
      "Literature review",
      "Research methodology",
      "Data analysis",
      "Experiment design",
      "Paper understanding",
      "Citation management",
      "LaTeX support",
    ],
  },
  {
    slug: "thesis",
    title: "Thesis Support",
    summary: "Support at every stage of your thesis, from topic selection to viva preparation.",
    icon: GraduationCap,
    items: [
      "Topic selection",
      "Research gap identification",
      "Methodology guidance",
      "Analysis",
      "Writing support",
      "Formatting",
      "Proofreading",
      "Viva preparation",
    ],
  },
  {
    slug: "career",
    title: "Career",
    summary: "Get ready for internships and jobs with reviews and realistic practice.",
    icon: Briefcase,
    items: [
      "Resume",
      "Portfolio",
      "LinkedIn",
      "Technical interview preparation",
      "Mock interviews",
      "Career guidance",
    ],
  },
];
