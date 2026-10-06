export type SeoPage = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  helpWith: string[];
  examples: string[];
  category: string; // matches a serviceCategories slug
};

export const seoPages: SeoPage[] = [
  {
    slug: "academic-help",
    metaTitle: "Academic Help for College & University Students",
    metaDescription:
      "Private tutoring, concept explanations and assignment guidance. Post your problem and get personal help from the UniSolve team.",
    eyebrow: "Academic help",
    h1: "Academic help that helps you actually understand",
    intro:
      "Stuck on a concept, a problem set or exam prep? Get one-on-one guidance that explains it until it clicks.",
    helpWith: ["Concept explanations", "Assignment guidance", "Problem-solving walkthroughs", "Exam preparation", "Tutoring sessions"],
    examples: ["“I don't understand Laplace transforms.”", "“Can someone explain normalization in DBMS?”", "“I need a study plan for my semester exams.”"],
    category: "academic",
  },
  {
    slug: "project-help",
    metaTitle: "Student Project Help & Mentorship",
    metaDescription:
      "Get mentorship for your college project — ideation, architecture, development guidance, debugging, testing and presentation prep. Launching in Hyderabad.",
    eyebrow: "Project help",
    h1: "Project mentorship from idea to demo day",
    intro:
      "Plan the architecture, unblock development, fix bugs and prepare your presentation with an experienced mentor beside you.",
    helpWith: ["Project ideation", "Architecture & tech stack", "Development guidance", "Debugging", "Testing", "Documentation & presentation"],
    examples: ["“How should I structure my MERN app?”", "“My IoT sensor readings are wrong.”", "“Help me prepare my final review presentation.”"],
    category: "projects",
  },
  {
    slug: "coding-help",
    metaTitle: "Coding Help for Students — Python, Java, C++, JavaScript",
    metaDescription:
      "Coding help for students from experienced engineers. Learn, debug and build in Python, Java, C/C++, JavaScript, React, SQL and more.",
    eyebrow: "Coding help",
    h1: "Coding help from engineers who write code every day",
    intro: "From your first program to a full-stack app — get explanations, code reviews and debugging help in your language.",
    helpWith: ["Python", "Java", "C/C++", "JavaScript & React", "SQL", "MATLAB", "Data structures & algorithms"],
    examples: ["“My recursion keeps overflowing the stack.”", "“Why does my React state not update?”", "“Explain this SQL join to me.”"],
    category: "coding",
  },
  {
    slug: "ai-ml-help",
    metaTitle: "AI & ML Project Support for Students",
    metaDescription:
      "AI/ML project support — model selection, PyTorch/TensorFlow debugging, datasets, evaluation and explanations from practising ML engineers.",
    eyebrow: "AI & ML",
    h1: "AI & ML project support that gets your model working",
    intro:
      "Understand the theory, pick the right model, fix training issues and evaluate properly — with an ML practitioner guiding you.",
    helpWith: ["Model selection", "PyTorch & TensorFlow", "Computer vision & NLP", "Dataset preparation", "Training & evaluation", "Explaining results"],
    examples: ["“My CNN's validation accuracy is stuck at 50%.”", "“Which model should I use for sentiment analysis?”", "“How do I read this confusion matrix?”"],
    category: "coding",
  },
  {
    slug: "research-support",
    metaTitle: "Research Support for Students & Scholars",
    metaDescription:
      "Research methodology, literature review guidance, data analysis, experiment design, paper understanding and LaTeX support for students and research scholars.",
    eyebrow: "Research support",
    h1: "Research support for methodology, analysis and tools",
    intro: "Work with researchers who can help you design studies, analyse data and understand the literature — while the research stays yours.",
    helpWith: ["Literature review guidance", "Research methodology", "Data analysis (SPSS, R, Python)", "Experiment design", "Paper understanding", "Citations & LaTeX"],
    examples: ["“Which statistical test fits my data?”", "“Help me understand this paper's method.”", "“My LaTeX bibliography won't compile.”"],
    category: "research",
  },
  {
    slug: "thesis-support",
    metaTitle: "Thesis Guidance & Mentorship",
    metaDescription:
      "Thesis mentorship — topic selection, research gap, methodology, analysis, writing feedback, formatting, proofreading and viva preparation.",
    eyebrow: "Thesis support",
    h1: "Thesis mentorship through every chapter",
    intro: "Structured guidance from topic selection to your viva — with feedback that strengthens your own writing and research.",
    helpWith: ["Topic selection", "Research gap identification", "Methodology guidance", "Analysis", "Writing feedback & proofreading", "Formatting", "Viva preparation"],
    examples: ["“I can't narrow down my thesis topic.”", "“Is my methodology chapter solid?”", "“My viva is in two weeks.”"],
    category: "thesis",
  },
  {
    slug: "viva-preparation",
    metaTitle: "Viva & Presentation Preparation",
    metaDescription:
      "Prepare for your project or thesis viva with mock questions, presentation feedback and confidence-building practice sessions.",
    eyebrow: "Viva preparation",
    h1: "Walk into your viva prepared and confident",
    intro: "Practise with someone who asks the hard questions first — and helps you explain your own work clearly.",
    helpWith: ["Mock viva sessions", "Likely question lists", "Presentation & slide feedback", "Explaining your methodology", "Handling tough questions"],
    examples: ["“What will examiners ask about my ML model?”", "“Review my final-year project slides.”", "“I freeze when I present.”"],
    category: "thesis",
  },
  {
    slug: "resume-help",
    metaTitle: "Resume, LinkedIn & Interview Help for Students",
    metaDescription:
      "Resume reviews, LinkedIn and portfolio feedback, technical interview preparation and mock interviews for students and freshers.",
    eyebrow: "Career help",
    h1: "Get interview-ready with real feedback",
    intro: "Polish your resume, portfolio and LinkedIn, then practise technical and HR interviews with people who hire.",
    helpWith: ["Resume review", "Portfolio & GitHub", "LinkedIn profile", "Technical interview preparation", "Mock interviews", "Career guidance"],
    examples: ["“My resume isn't getting shortlisted.”", "“Mock DSA interview before placements.”", "“How do I present my projects?”"],
    category: "career",
  },
  {
    slug: "coding-debugging",
    metaTitle: "Code Debugging Help for Students",
    metaDescription:
      "Stuck on an error? Share your code privately and debug it together with an experienced developer. Python, Java, C++, JavaScript and more.",
    eyebrow: "Debugging",
    h1: "Stuck on a bug? Let's debug it together.",
    intro: "Share your code and error privately. An experienced developer helps you find the root cause — and explains it so you can fix the next one yourself.",
    helpWith: ["Runtime & compile errors", "Logic bugs", "Environment & dependency issues", "Performance problems", "Database & API errors"],
    examples: ["“Segmentation fault in my C program.”", "“ModuleNotFoundError after pip install.”", "“My API returns 500 only in production.”"],
    category: "coding",
  },
  {
    slug: "engineering-project-help",
    metaTitle: "Engineering Project Guidance for Students",
    metaDescription:
      "Guidance for B.Tech, B.E. and M.Tech projects — CSE, ECE, EEE, mechanical and civil. Mentorship on design, implementation, documentation and reviews.",
    eyebrow: "Engineering projects",
    h1: "Engineering project guidance for every branch",
    intro: "Mini projects, major projects and research projects across CSE, ECE, EEE, mechanical and civil — with a mentor who has built similar systems.",
    helpWith: ["Problem statement & scope", "System design", "Simulation & hardware guidance", "Implementation support", "Report & documentation", "Review preparation"],
    examples: ["“Help me scope my final-year project.”", "“My MATLAB simulation results look wrong.”", "“How should I structure my project report?”"],
    category: "projects",
  },
];

export const getSeoPage = (slug: string) => seoPages.find((p) => p.slug === slug);
