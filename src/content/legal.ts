export type LegalDoc = {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
};

const UPDATED = "6 October 2026";

export const legalDocs: LegalDoc[] = [
  {
    slug: "academic-integrity",
    title: "Academic Integrity Policy",
    summary: "UniSolve exists to help students learn and solve problems — never to help them cheat.",
    updated: UPDATED,
    sections: [
      {
        heading: "Our position",
        body: [
          "UniSolve is a platform for legitimate learning, mentoring, tutoring, technical assistance and academic support. We help you understand, plan, debug, review and prepare. The work you submit for assessment must be your own.",
          "Students are responsible for following the academic rules of their institution. If your institution restricts outside help for a specific task, you must not request it on UniSolve.",
        ],
      },
      {
        heading: "Strictly prohibited",
        body: [
          "Plagiarism, or requesting work intended to be submitted as your own.",
          "Fabricated research results, invented data or manipulated experiments.",
          "Fake, fabricated or misleading citations.",
          "Impersonation of a student in any class, exam, interview, viva or assessment.",
          "Assistance during live exams, tests or proctored assessments.",
          "Sharing, requesting or using another person's login credentials (credential theft).",
          "Submission of another person's work as one's own.",
        ],
      },
      {
        heading: "What we do",
        body: [
          "Explain concepts, walk through worked examples and recommend learning resources.",
          "Review your code, writing or methodology and give feedback you then apply yourself.",
          "Help you debug, design an architecture, plan milestones or prepare for a presentation or viva.",
          "Proofread for language and formatting while preserving your own ideas and authorship.",
        ],
      },
      {
        heading: "Enforcement",
        body: [
          "Requests that breach this policy are declined. Accounts that repeatedly or seriously breach it are suspended or removed, and payments for prohibited work are not processed.",
          "Report a suspected breach from any request using “Report Issue”, or through the Help Center.",
        ],
      },
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    summary: "What we collect, why, and how you stay in control.",
    updated: UPDATED,
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Account data: email address, a display name you choose, and your password (stored only as a secure hash by our authentication provider).",
          "Request data: the problem you describe, files you upload, messages, deadlines, budget preferences and payment references.",
          "Technical data: basic logs required to keep the service secure. We do not sell personal data.",
        ],
      },
      {
        heading: "Minimal collection",
        body: [
          "Students are never required to share their college, student ID or full legal name to use UniSolve. You can submit requests privately and track them with your Request ID.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To understand your request, deliver the support, process payments, prevent fraud and abuse, provide customer support and send notifications about your requests.",
        ],
      },
      {
        heading: "Who can see your data",
        body: [
          "Your request and files are visible only to you and the UniSolve team members handling it. Your phone number and email are never shared with anyone outside UniSolve.",
          "Files are kept in private storage and are accessed only through short-lived, authorised links.",
        ],
      },
      {
        heading: "Retention and deletion",
        body: [
          "You can delete files you uploaded from your dashboard. Request records are retained as long as needed for support, disputes, accounting and legal obligations, after which they are deleted or anonymised.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Subject to applicable law, including India's Digital Personal Data Protection Act, 2023, you may request access to, correction of, or erasure of your personal data, and withdraw consent. Raise a request through the Help Center.",
        ],
      },
      {
        heading: "Service providers",
        body: [
          "We use trusted infrastructure providers for hosting, database, authentication and file storage. They process data on our behalf under their own security and privacy commitments.",
        ],
      },
    ],
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    summary: "The rules for using UniSolve.",
    updated: UPDATED,
    sections: [
      {
        heading: "The service",
        body: [
          "UniSolve provides learning, mentoring and technical support to students. Requests are handled by the UniSolve team through the platform's private chat.",
        ],
      },
      {
        heading: "Eligibility and accounts",
        body: [
          "You must provide accurate information, keep your password secure and are responsible for activity on your account. One person may not operate multiple accounts to abuse offers or referrals.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "You agree to follow the Academic Integrity Policy and Student Guidelines. You must not upload unlawful content, malware, or material you have no right to share, or attempt to move payments or communication off the platform to avoid its protections.",
        ],
      },
      {
        heading: "Quotes and payments",
        body: [
          "Each request receives a quote before work begins. You see the full price before paying. Larger engagements may be split into milestones. Work begins once the relevant payment is verified.",
        ],
      },
      {
        heading: "Refunds and disputes",
        body: ["Refunds are handled under the Refund Policy. Disputes can be raised from the request page and are reviewed by UniSolve staff."],
      },
      {
        heading: "Limitation of liability",
        body: [
          "Our support is guidance. Outcomes such as grades, publication or hiring decisions depend on many factors outside our control and are not guaranteed. To the extent permitted by law, UniSolve's liability is limited to the amount you paid for the affected request.",
        ],
      },
      {
        heading: "Termination",
        body: ["We may suspend or close accounts that breach these terms or our policies."],
      },
      {
        heading: "Governing law",
        body: ["These terms are governed by the laws of India, with courts in Hyderabad, Telangana having jurisdiction."],
      },
    ],
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    summary: "When and how you can get your money back.",
    updated: UPDATED,
    sections: [
      {
        heading: "Before work starts",
        body: ["If work hasn't started on your request, you can cancel and receive a full refund of any amount paid."],
      },
      {
        heading: "After work starts",
        body: [
          "Once work has started, the 50% advance covers work already done and is refunded only if the support isn't delivered as agreed.",
          "If the agreed support was not delivered, or was materially different from what was agreed, raise a dispute from the request page. UniSolve staff review the conversation and files and may issue a full or partial refund.",
        ],
      },
      {
        heading: "Not eligible",
        body: ["Requests cancelled because they breach the Academic Integrity Policy are not eligible for refunds of work already delivered."],
      },
      {
        heading: "How refunds are paid",
        body: [
          "Approved refunds are returned to the original UPI account, normally within 5–7 working days of approval, or issued as UniSolve credit if you prefer.",
        ],
      },
    ],
  },
  {
    slug: "student-guidelines",
    title: "Student Guidelines",
    summary: "How to get the best help — the right way.",
    updated: UPDATED,
    sections: [
      {
        heading: "Describe your problem well",
        body: [
          "Tell us what you're trying to do, what you've already tried, and where you're stuck. Attach your code, error messages, briefs or drafts — the more context, the better the match.",
        ],
      },
      {
        heading: "Stay on the platform",
        body: [
          "Keep communication and payments on UniSolve. This protects your privacy and makes you eligible for support and refunds.",
        ],
      },
      {
        heading: "Use help to learn",
        body: [
          "Use explanations, reviews and feedback to improve your own work. Do not ask us to produce work you will submit as your own, or to help during an exam.",
        ],
      },
      {
        heading: "Be respectful",
        body: ["Harassment, abusive language or attempts to obtain staff members' personal details are not allowed."],
      },
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    summary: "We keep cookies and local storage to the minimum.",
    updated: UPDATED,
    sections: [
      {
        heading: "Essential storage",
        body: [
          "We use browser storage that is strictly necessary to keep you signed in, protect your session and remember preferences such as light or dark mode, and to save an unfinished request draft on your device.",
        ],
      },
      {
        heading: "No advertising trackers",
        body: ["We do not use advertising or cross-site tracking cookies."],
      },
      {
        heading: "Managing storage",
        body: ["You can clear cookies and site data in your browser settings. Doing so will sign you out."],
      },
    ],
  },
];

export const getLegalDoc = (slug: string) => legalDocs.find((d) => d.slug === slug);
