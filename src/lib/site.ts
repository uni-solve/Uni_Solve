export const siteConfig = {
  name: "UniSolve",
  tagline: "Your Problem. Our Expertise.",
  description:
    "Private, expert support for students — academics, coding, projects, research, thesis preparation and career readiness.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
  supportEmail: "support@unisolve.in",
  social: {
    instagram: "https://instagram.com/",
    linkedin: "https://linkedin.com/",
    youtube: "https://youtube.com/",
  },
} as const;

export const mainNav = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Services", href: "/services" },
  { label: "For Students", href: "/for-students" },
  { label: "For Experts", href: "/for-experts" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const routes = {
  home: "/",
  postProblem: "/post",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  requests: "/dashboard/requests",
  messages: "/dashboard/messages",
  profile: "/dashboard/profile",
  becomeExpert: "/become-an-expert",
} as const;

export const footerNav = [
  {
    title: "Platform",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Services", href: "/services" },
      { label: "Pricing", href: "/pricing" },
      { label: "Become an Expert", href: "/become-an-expert" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Contact", href: "/contact" },
      { label: "Refund Policy", href: "/legal/refund-policy" },
      { label: "Report an Issue", href: "/help#report" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy-policy" },
      { label: "Terms", href: "/legal/terms-of-service" },
      { label: "Academic Integrity", href: "/legal/academic-integrity" },
      { label: "Expert Agreement", href: "/legal/expert-agreement" },
    ],
  },
] as const;
