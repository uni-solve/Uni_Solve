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
    h1: "Assignment help — solved step by step",
    intro:
      "Send your assignment or problem set and get every question solved with clear, step-by-step explanations.",
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
    h1: "Project development, built and explained",
    intro:
      "We build your project end to end, then walk you through the code and architecture so you can present it with confidence.",
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
    h1: "Coding solutions, explained line by line",
    intro: "Lab programs, assignments and apps — working code in your language, with a walkthrough of how it works.",
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
  {
    slug: "ece-project-help",
    metaTitle: "ECE Project Help — Wireless, RF, 5G & Embedded",
    metaDescription:
      "ECE assignments and projects solved step by step: wireless communications, RF & microwave, 5G/LTE, antennas, DSP, VLSI, and embedded/IoT hardware projects. Hyderabad & online.",
    eyebrow: "ECE & embedded",
    h1: "ECE projects — wireless, RF, 5G and hardware, solved and explained",
    intro: "From OFDM and MIMO simulations to patch antennas in HFSS and ESP32 hardware builds — we solve it step by step and walk you through every part.",
    helpWith: ["Wireless communications (OFDM, MIMO, fading)", "RF & microwave, Smith chart, S-parameters", "5G / LTE system simulations", "Antenna design (HFSS, CST)", "DSP, VLSI & FPGA (Verilog/VHDL)", "Embedded & IoT hardware (Arduino, ESP32, STM32)"],
    examples: ["“Simulate BER vs SNR for 16-QAM over a Rayleigh channel in MATLAB.”", "“Design a 2.4 GHz patch antenna and explain the S11 plot.”", "“Build an ESP32 IoT sensor node for my final-year project.”"],
    category: "ece",
  },
];

export const getSeoPage = (slug: string) => seoPages.find((p) => p.slug === slug);
