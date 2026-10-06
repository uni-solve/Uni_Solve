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
    title: "Academic Support",
    summary: "Understand concepts, work through problems and prepare for exams with a tutor.",
    icon: BookOpen,
    items: ["Assignment guidance", "Concept explanations", "Problem solving", "Tutoring", "Exam preparation"],
  },
  {
    slug: "coding",
    title: "Coding & Technology",
    summary: "Debug, learn and build with engineers who work in these stacks every day.",
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
    title: "Projects",
    summary: "Mentorship from idea to architecture, implementation, testing and your final demo.",
    icon: Layers,
    items: [
      "Project ideation",
      "Architecture",
      "Development guidance",
      "Debugging",
      "Dataset support",
      "Testing",
      "Documentation",
      "Presentation preparation",
    ],
  },
  {
    slug: "research",
    title: "Research",
    summary: "Methodology, analysis and tooling support from people who have published.",
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
    summary: "Mentorship through every stage of your thesis — your research, your words.",
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
