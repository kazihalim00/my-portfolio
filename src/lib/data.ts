// All portfolio content lives here so it is easy to update in one place.

export const profile = {
  name: "Kazi Abdul Halim Sunny",
  short: "Kazi Abdul Halim Sunny",
  initials: "KS",
  title: "Full Stack Developer · Laravel & Vue.js",
  roles: [
    "Full Stack Developer",
    "Laravel & Vue.js Developer",
    "Python (FastAPI, Django) Developer",
    "Flutter App Builder",
    "AI & RAG Builder",
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
  links?: { label: string; href: string }[];
};

export const experience: TimelineItem[] = [
  {
    role: "Support Engineer Intern",
    org: "AppifyLab",
    period: "Sep 2026 – Nov 2026",
    kind: "work",
    points: [
      "Industry internship completed as part of my B.Sc. in Software Engineering program.",
      "Provided client support for three live SaaS products (EzyCourse, EzyCommunity and Skreno), helping many clients and handling several requests for the same client from first report to final fix.",
      "Reproduced issues with browser console logs, API responses and cross-browser/device checks, then reported confirmed bugs to developers with clear steps to reproduce.",
      "Did light testing of new features with the product team before release, and tracked every issue to resolution on Trello.",
    ],
    links: [
      { label: "EzyCourse", href: "https://ezycourse.com/" },
      { label: "EzyCommunity", href: "https://ezycommunity.com/" },
      { label: "Skreno", href: "https://www.skreno.ai/" },
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
    links: [{ label: "Certificate", href: "https://drive.google.com/file/d/1gh_HbbRzMKhmjD6Vwt-kbPHZbvnMuaYY/view" }],
  },
  {
    role: "Facilitator Development Program (FDP)",
    org: "Bangladesh Youth Leadership Center (BYLC)",
    period: "May 2026",
    kind: "training",
    points: ["Certified Leadership Facilitator; facilitated leadership sessions for university students up to second year (May – Jul 2026)."],
    links: [{ label: "Certificate", href: "https://drive.google.com/file/d/15NY3zr7xDi_PqajTc3gAMa_oejgDAPJu/view" }],
  },
];

export type Project = {
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  category: ("Laravel" | "PHP" | "Python" | "Flutter" | "AI" | "JavaScript")[];
  badge: string;
  links: { label: string; href: string }[];
  highlights: string[];
  accent: string;
};

export const projects: Project[] = [
  {
    name: "PharmaCareBD",
    tagline: "Business management SaaS, live with 30+ clients",
    description:
      "A multi-tenant Laravel SaaS in production with three products: Pharmacy Management, Diagnostic Centre Management and Shop Management. POS with batch stock and split payments, an OCR invoice scanner, and every stock and money change in a DB transaction with a ledger and audit log.",
    tags: ["Laravel 12", "MySQL", "Tailwind CSS", "Alpine.js", "PHPUnit"],
    category: ["Laravel", "PHP"],
    badge: "Live · 30+ clients",
    links: [{ label: "Live site", href: "https://pharmacarebd.com" }],
    highlights: ["3 products in production", "Search 80 ms → 5–20 ms", "300+ automated tests"],
    accent: "from-sky-400 to-emerald-400",
  },
  {
    name: "Noor-AI",
    tagline: "Cite-or-abstain Islamic question answering",
    description:
      "My thesis: a hybrid search engine (BM25 + embeddings + reranker) over 470,321 passages in Bangla, Banglish and English. It quotes sources word-for-word and declines to answer when evidence is weak.",
    tags: ["Python", "FastAPI", "Laravel", "MySQL", "RAG"],
    category: ["Python", "AI", "Laravel"],
    badge: "Thesis",
    links: [],
    highlights: ["140-question benchmark (NoorBench)", "13-configuration evaluation harness", "Laravel blind A/B portal for scholars"],
    accent: "from-emerald-400 to-cyan-400",
  },
  {
    name: "Tazkiyah",
    tagline: "Islamic learning & community platform",
    description: "A community feed, habit tracker, quizzes, real-time chat and an LMS with an AI assistant, across 100+ routes.",
    tags: ["Laravel", "MySQL", "Tailwind CSS", "Docker"],
    category: ["Laravel", "AI"],
    badge: "Live demo",
    links: [{ label: "Live demo", href: "https://tazkiyah-lms-backend.onrender.com/" }],
    highlights: ["100+ routes", "Real-time chat", "AI learning assistant"],
    accent: "from-violet-400 to-fuchsia-400",
  },
  {
    name: "Noor-AI Companion App",
    tagline: "AI Islamic companion for mobile",
    description:
      "A Flutter app that answers from the Quran and Hadith. Gemini 2.5 Flash with automatic fallback to Groq (Llama 3 70B), chat memory on device, and PDF export of conversations with Bangla fonts.",
    tags: ["Flutter", "Dart", "Gemini API", "Groq"],
    category: ["Flutter", "AI"],
    badge: "Mobile",
    links: [{ label: "Code", href: "https://github.com/kazihalim00/noor_ai_app" }],
    highlights: ["Two-model failover", "Chat history PDF export", "Dark / light themes"],
    accent: "from-teal-400 to-emerald-400",
  },
  {
    name: "House Rent Management System",
    tagline: "Listings, bookings and chat for rentals",
    description:
      "Property listings, a booking workflow, visit appointments, reviews and in-app chat with XSS-safe rendering. Built as the IT Lab Solutions course project.",
    tags: ["Laravel", "MySQL", "Bootstrap"],
    category: ["Laravel", "PHP"],
    badge: "IT Lab project",
    links: [{ label: "Code", href: "https://github.com/kazihalim00/House-Rent" }],
    highlights: ["Booking workflow", "Visit appointments", "XSS-safe chat"],
    accent: "from-amber-400 to-orange-400",
  },
  {
    name: "Product Recommendation Engine",
    tagline: "WooCommerce plugin that suggests products",
    description:
      "A WordPress plugin that tracks product views and purchases, then shows related recommendations on product and shop pages, with an admin settings screen. Built in a team of three.",
    tags: ["PHP", "WordPress", "WooCommerce", "JavaScript"],
    category: ["PHP"],
    badge: "Plugin",
    links: [{ label: "Code", href: "https://github.com/kazihalim00/Product-Recommendation-Engine" }],
    highlights: ["View & purchase tracking", "Shop-page recommendations", "Admin settings"],
    accent: "from-pink-400 to-rose-400",
  },
  {
    name: "Python LAN Chat System",
    tagline: "Multi-client chat over TCP sockets",
    description:
      "A local-network chat app with a multi-threaded server, a Tkinter dark UI, an active-status monitor for users, and a fix for TCP sticky packets.",
    tags: ["Python", "Sockets", "Threading", "Tkinter"],
    category: ["Python"],
    badge: "Networking",
    links: [{ label: "Code", href: "https://github.com/kazihalim00/Python-LAN-Chat-System" }],
    highlights: ["Multi-threaded server", "Live user status", "Sticky-packet fix"],
    accent: "from-sky-400 to-blue-400",
  },
  {
    name: "Library Management System",
    tagline: "Books, members, issues and fines",
    description:
      "A PHP & MySQL app for running a library: admin login, book and member management, issuing and returning with automatic stock updates, fine calculation and a dashboard.",
    tags: ["PHP", "MySQL", "Bootstrap"],
    category: ["PHP"],
    badge: "Core PHP",
    links: [{ label: "Code", href: "https://github.com/kazihalim00/Library-Management-System" }],
    highlights: ["Issue / return flow", "Auto stock updates", "Fine calculation"],
    accent: "from-lime-400 to-green-400",
  },
  {
    name: "This portfolio",
    tagline: "A portfolio you can play with",
    description:
      "Next.js + TypeScript site with dev games (Bug Spotter, Output Guess, real SQL in the browser), a terminal, a book reader and live leaderboards.",
    tags: ["Next.js", "TypeScript", "Tailwind", "Playwright"],
    category: ["JavaScript"],
    badge: "You are here",
    links: [
      { label: "Play Dev Arena", href: "#arena" },
      { label: "Code", href: "https://github.com/kazihalim00/my-portfolio" },
    ],
    highlights: ["3 dev games", "In-browser SQL", "39 e2e tests"],
    accent: "from-indigo-400 to-violet-400",
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
  Quality: ["Manual & exploratory testing", "Bug reporting", "API testing (Postman)", "Chrome DevTools", "Trello"],
};

export const learning = [
  { name: "Noor-AI thesis (RAG, FastAPI)", stage: "Building now" },
  { name: "Tazkiyah LMS (Laravel)", stage: "Building now" },
  { name: "Noor-AI companion app (Flutter)", stage: "Shipped" },
  { name: "TypeScript & Next.js", stage: "Leveling up" },
];

export const leadership: { role: string; org: string; period: string; cert?: string }[] = [
  {
    role: "Lead Mentor & Mentor's Trainer",
    org: "MU Programming Olympiad",
    period: "2025 – 2026",
    cert: "https://drive.google.com/file/d/1bBWGg9gosotQIRZ7nM6QMXuOIn9DAV3v/view",
  },
  {
    role: "Judge",
    org: "MU Programming Olympiad 2025, Season 02",
    period: "Jun 2025",
    cert: "https://drive.google.com/file/d/1S26RwEr_p2H6WfiAAFfbUHEPRleEvIkL/view",
  },
  {
    role: "Problem Setter",
    org: "MU Programming Olympiad 2025, Season 02",
    period: "Jun 2025",
    cert: "https://drive.google.com/file/d/1QM74iLhkJyjp5z75TnXucLs3e0lz7UGk/view",
  },
  {
    role: "Content Developer: C (2023), Python (2025), updated C (2026)",
    org: "MU Programming Olympiad",
    period: "2023 – 2026",
    cert: "https://drive.google.com/file/d/1dNdvfHCcWpIGB8sEGhpQ2MH_eRAKZlrk/view",
  },
  { role: "Mentor", org: "MU Programming Olympiad", period: "2023 – 2026" },
  { role: "Publication Secretary", org: "Metropolitan University Islamic Society", period: "2025 – 2026" },
  { role: "Certified Leadership Facilitator", org: "BYLC: facilitated leadership sessions for university students up to second year", period: "05/2026 – 07/2026" },
  { role: "Co-Curricular Secretary", org: "SWE Innovators Forum, MU: technical workshops and events for 200+ members", period: "01/2025 – 02/2026" },
  { role: "Additional Cultural Secretary", org: "SWE Innovators Forum, MU", period: "01/2023 – 12/2023" },
  {
    role: "Co-Founder",
    org: "Roar for Street Child: started in Sylhet, later active in every division of Bangladesh",
    period: "01/2023 – 12/2023",
  },
];

export const education = {
  degree: "B.Sc. in Software Engineering",
  school: "Metropolitan University, Sylhet",
  period: "2023 – 2026",
  detail:
    "CGPA 3.96 / 4.00 · Chairman's Scholarship (4.00 GPA in three consecutive semesters) and Vice Chancellor's Scholarship (three consecutive semesters at 4.00, at most one course at 3.75)",
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
  { id: "hire", label: "Hire me" },
  { id: "guestbook", label: "Guestbook" },
  { id: "contact", label: "Contact" },
];
