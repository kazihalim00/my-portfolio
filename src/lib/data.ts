// All portfolio content lives here so it is easy to update in one place.

export const profile = {
  name: "Kazi Abdul Halim Sunny",
  short: "Kazi Sunny",
  initials: "KS",
  title: "Full Stack Developer · Laravel & Vue.js",
  roles: [
    "Full Stack Developer",
    "Laravel & Vue.js Developer",
    "Python (FastAPI, Django) Developer",
    "Flutter App Builder",
    "QA & Test Automation",
  ],
  location: "Sylhet, Bangladesh",
  email: "kaziabdulhalimsunny01@gmail.com",
  github: "kazihalim00",
  githubUrl: "https://github.com/kazihalim00",
  linkedinUrl: "https://www.linkedin.com/in/kazisunny/",
  summary:
    "Full-stack developer who loves turning real-world problems into simple, reliable software. Certified in Laravel and Vue.js, I also build with Python (FastAPI, Django) and Flutter, taking applications from database design to user interface. After testing and troubleshooting live SaaS products, I am now growing into test automation with Playwright and TypeScript.",
  cv: {
    developer: "/cv/Kazi_Sunny_CV_Developer.pdf",
    qa: "/cv/Kazi_Sunny_CV_QA.pdf",
  },
};

export const stats = [
  { value: 3.96, decimals: 2, suffix: "", label: "CGPA out of 4.00" },
  { value: 470, decimals: 0, suffix: "K+", label: "Passages indexed in my thesis search engine" },
  { value: 100, decimals: 0, suffix: "+", label: "Routes built in Tazkiyah, my Laravel platform" },
  { value: 200, decimals: 0, suffix: "+", label: "Students reached through workshops" },
];

export type TimelineItem = {
  role: string;
  org: string;
  period: string;
  kind: "work" | "training" | "leadership";
  points: string[];
  link?: { label: string; href: string };
};

export const experience: TimelineItem[] = [
  {
    role: "Support Engineer Intern",
    org: "AppifyLab",
    period: "Sep 2026 – Nov 2026",
    kind: "work",
    points: [
      "Tested and troubleshot client-reported issues in three live SaaS products: EzyCourse, EzyCommunity and Skreno.",
      "Reproduced issues with browser console logs, API responses and cross-browser/device checks, then reported confirmed bugs to developers with clear steps to reproduce.",
      "Tested new features with the product team before release and shared user-experience feedback.",
      "Supported clients by email, chat and video call, and tracked every issue to resolution on Trello.",
    ],
  },
  {
    role: "Laravel Vue Developer Program",
    org: "IT Lab Solutions",
    period: "2026",
    kind: "training",
    points: [
      "Five-month on-site training with industry experience in Laravel, Vue.js and MySQL.",
      "Built the House Rent Management System as the course project.",
    ],
    link: {
      label: "Certificate",
      href: "https://drive.google.com/file/d/1gh_HbbRzMKhmjD6Vwt-kbPHZbvnMuaYY/view",
    },
  },
  {
    role: "Facilitator Development Program (FDP)",
    org: "Bangladesh Youth Leadership Center (BYLC)",
    period: "May 2026",
    kind: "training",
    points: ["Certified Leadership Facilitator; facilitated leadership sessions for youth (May – Jul 2026)."],
    link: {
      label: "Certificate",
      href: "https://drive.google.com/file/d/15NY3zr7xDi_PqajTc3gAMa_oejgDAPJu/view",
    },
  },
];

export type Project = {
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  category: ("Laravel" | "Python" | "AI" | "Testing")[];
  badge: string;
  links: { label: string; href: string }[];
  highlights: string[];
  accent: string;
};

export const projects: Project[] = [
  {
    name: "Noor-AI",
    tagline: "Cite-or-abstain Islamic question answering",
    description:
      "My thesis: a hybrid search engine (BM25 + embeddings + reranker) over 470,321 passages in Bangla, Banglish and English. It quotes sources word-for-word and declines to answer when evidence is weak.",
    tags: ["Python", "FastAPI", "Laravel", "MySQL", "RAG"],
    category: ["Python", "AI", "Laravel", "Testing"],
    badge: "Thesis",
    links: [],
    highlights: [
      "140-question labeled benchmark (NoorBench)",
      "13-configuration evaluation harness",
      "Laravel blind A/B portal for scholar rating",
    ],
    accent: "from-emerald-400 to-cyan-400",
  },
  {
    name: "Tazkiyah",
    tagline: "Islamic learning & community platform",
    description:
      "A community feed, habit tracker, quizzes, real-time chat and an LMS with an AI assistant, across 100+ routes.",
    tags: ["Laravel", "MySQL", "Tailwind CSS", "Docker"],
    category: ["Laravel", "AI"],
    badge: "Live demo",
    links: [
      { label: "Live demo", href: "https://tazkiyah-lms-backend.onrender.com/" },
      { label: "Code", href: "https://github.com/kazihalim00/tazkiyah-lms-backend" },
    ],
    highlights: ["100+ routes", "Real-time chat", "AI learning assistant"],
    accent: "from-violet-400 to-fuchsia-400",
  },
  {
    name: "House Rent Management System",
    tagline: "Listings, bookings and chat for rentals",
    description:
      "Property listings, a booking workflow, visit appointments, reviews and in-app chat with XSS-safe rendering. Built as the IT Lab Solutions course project.",
    tags: ["Laravel", "MySQL", "Bootstrap"],
    category: ["Laravel"],
    badge: "IT Lab project",
    links: [{ label: "Code", href: "https://github.com/kazihalim00/House-Rent" }],
    highlights: ["Booking workflow", "Visit appointments", "XSS-safe chat"],
    accent: "from-amber-400 to-orange-400",
  },
  {
    name: "QA Lab (this site)",
    tagline: "A portfolio you can test",
    description:
      "This portfolio itself: a Next.js + TypeScript app with a bug-hunting game, a simulated Playwright test run, a terminal and a guestbook.",
    tags: ["Next.js", "TypeScript", "Tailwind", "Playwright"],
    category: ["Testing"],
    badge: "You are here",
    links: [
      { label: "Try the lab", href: "#lab" },
      { label: "Code", href: "https://github.com/kazihalim00/my-portfolio" },
    ],
    highlights: ["8 planted bugs", "Cross-browser test runner", "Keyboard-first UX"],
    accent: "from-sky-400 to-indigo-400",
  },
];

export const skills = {
  Development: [
    "PHP",
    "Laravel",
    "Vue.js",
    "JavaScript",
    "Python",
    "FastAPI",
    "Django",
    "Flutter",
    "MySQL",
    "REST APIs",
    "Git",
    "Docker",
  ],
  Testing: [
    "Manual & exploratory testing",
    "Test case design",
    "Bug reporting",
    "Regression testing",
    "Cross-browser testing",
    "API testing (Postman)",
    "Chrome DevTools",
    "Trello",
  ],
};

export const learning = [
  { name: "JavaScript → TypeScript", stage: "Learning now" },
  { name: "Playwright (UI automation)", stage: "Learning now" },
  { name: "API test automation", stage: "Next up" },
  { name: "CI/CD for test suites", stage: "Next up" },
];

export const leadership = [
  { role: "Lead Mentor & Mentor's Trainer", org: "MU Programming Olympiad", period: "2025 – 2026" },
  { role: "Mentor", org: "MU Programming Olympiad", period: "2023 – 2026" },
  { role: "Publication Secretary", org: "Metropolitan University Islamic Society", period: "2025 – 2026" },
  { role: "Certified Leadership Facilitator", org: "BYLC", period: "05/2026 – 07/2026" },
  { role: "Co-Curricular Secretary", org: "SWE Innovators Forum, MU", period: "01/2025 – 02/2026" },
  { role: "Additional Cultural Secretary", org: "SWE Innovators Forum, MU", period: "01/2023 – 12/2023" },
  { role: "Co-Founder", org: "Roar for Street Child", period: "01/2023 – 12/2023" },
];

export const education = {
  degree: "B.Sc. in Software Engineering",
  school: "Metropolitan University, Sylhet",
  period: "2023 – 2026 (expected)",
  detail: "CGPA 3.96 / 4.00 · Vice Chancellor's Scholarship and Chairman's Scholarship for a perfect 4.00 GPA",
};

export const sections = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "arena", label: "Dev Arena" },
  { id: "lab", label: "QA Lab" },
  { id: "books", label: "Books" },
  { id: "guestbook", label: "Guestbook" },
  { id: "contact", label: "Contact" },
];
