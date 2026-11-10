"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, Copy, Download, Layers, Mail, MapPin, Rocket, ShieldCheck, Briefcase } from "lucide-react";
import { LinkedinIcon } from "./icons";
import { Reveal, Section, SpotlightCard } from "./ui";
import { profile } from "@/lib/data";

export const hireMailto = `mailto:${profile.email}?subject=${encodeURIComponent(
  "Job opportunity for Kazi Abdul Halim Sunny"
)}&body=${encodeURIComponent(
  "Hi Kazi,\n\nI saw your portfolio and would like to talk about a role.\n\nCompany:\nRole:\nWork mode (on-site / remote / hybrid):\n\nBest,\n"
)}`;

const reasons = [
  {
    icon: Layers,
    title: "I ship full features, end to end",
    body: "Database design, API, admin panel and UI. Laravel and Vue on the web, FastAPI for AI services, Flutter for mobile.",
    proof: "Tazkiyah: 100+ routes, live on the web",
    href: "#projects",
  },
  {
    icon: BrainCircuit,
    title: "I build real AI products",
    body: "My thesis Noor-AI is a RAG search engine with a FastAPI backend and a Laravel front, plus a Flutter companion app.",
    proof: "470K+ passages indexed",
    href: "#projects",
  },
  {
    icon: ShieldCheck,
    title: "My code is tested before you see it",
    body: "At AppifyLab I reproduced and reported real bugs in live SaaS products. Now I write code that is easy to debug and I check edge cases first.",
    proof: "This site runs an automated Playwright test suite",
    href: "#lab",
  },
  {
    icon: Rocket,
    title: "I learn fast and I show up",
    body: "Top of my class, finished a five-month Laravel Vue program and trained as a BYLC facilitator. I like ownership and clear deadlines.",
    proof: "3.96 / 4.00 CGPA · 200+ students reached",
    href: "#journey",
  },
];

const firstMonth = [
  { when: "Week 1", what: "Set up, read the codebase, ship a small fix to production." },
  { when: "Week 2-3", what: "Take a real ticket end to end: schema, API, UI and tests." },
  { when: "Week 4", what: "Own a feature, document it and help review others' work." },
];

const fits = ["Full Stack Developer", "Laravel / PHP Developer", "Python (FastAPI) Developer", "Flutter Developer"];

export function Hire() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <Section
      id="hire"
      eyebrow="09 · Hire me"
      title={
        <>
          Why your team should <span className="gradient-text">hire me</span>.
        </>
      }
      intro="Short version: give me a feature and I will take it from the database to the screen, then make sure it does not break."
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {reasons.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.06}>
              <SpotlightCard className="flex h-full flex-col p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand/20 to-brand2/20 text-brand">
                  <r.icon size={19} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{r.title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">{r.body}</p>
                <a href={r.href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
                  <Check size={13} /> {r.proof}
                </a>
              </SpotlightCard>
            </Reveal>
          ))}

          <Reveal delay={0.24} className="sm:col-span-2">
            <SpotlightCard className="p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted">My first month on your team</p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {firstMonth.map((s, i) => (
                  <li key={s.when} className="relative rounded-xl border border-line/10 bg-fg/[0.02] p-4">
                    <span className="font-mono text-xs text-brand">
                      0{i + 1} · {s.when}
                    </span>
                    <p className="mt-1.5 text-sm">{s.what}</p>
                  </li>
                ))}
              </ol>
            </SpotlightCard>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="relative h-full lg:sticky lg:top-24 lg:h-auto">
            <div className="absolute -inset-[1.5px] rounded-[18px] bg-gradient-to-br from-brand via-brand2 to-brand opacity-70 blur-[2px]" aria-hidden />
            <div className="card relative overflow-hidden p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/20 blur-3xl" aria-hidden />
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/kazi.jpg" alt="" width={64} height={64} className="h-16 w-16 rounded-full border-2 border-brand/50 object-cover" />
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold leading-tight">{profile.name}</p>
                  <p className="mt-0.5 text-sm text-muted">{profile.title}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="chip gap-2 border-pass/30 bg-pass/10 text-pass">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pass opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-pass" />
                  </span>
                  Available now
                </span>
                <span className="chip gap-1.5">
                  <MapPin size={12} /> {profile.location}
                </span>
              </div>

              <p className="mt-6 flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
                <Briefcase size={13} /> Roles I am a fit for
              </p>
              <ul className="mt-3 space-y-2">
                {fits.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand/15 text-brand">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={hireMailto}
                className="group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand2 px-5 py-3.5 font-display text-base font-semibold text-white shadow-lg shadow-brand/30 transition hover:-translate-y-0.5 hover:shadow-brand/50 dark:text-slate-950"
              >
                <Mail size={18} /> Hire me: send an offer
              </a>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <a href={profile.cv.developer} download className="btn-ghost justify-center px-2 text-xs">
                  <Download size={14} /> CV
                </a>
                <button onClick={copy} className="btn-ghost justify-center px-2 text-xs" aria-label="Copy email address">
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Email"}
                </button>
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="btn-ghost justify-center px-2 text-xs">
                  <LinkedinIcon /> LinkedIn
                </a>
              </div>
              <p className="mt-4 text-center text-xs text-muted">I reply within a day.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/** Floating "Hire me" pill that shows after the hero and hides near the hire/contact sections. */
export function HireFab() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.8;
      const near = ["hire", "contact"].some((id) => {
        const r = document.getElementById(id)?.getBoundingClientRect();
        return r && r.top < window.innerHeight && r.bottom > 0;
      });
      setShow(past && !near);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href="#hire"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand2 px-5 py-3 font-display text-sm font-semibold text-white shadow-xl shadow-brand/30 transition hover:-translate-y-0.5 dark:text-slate-950"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Hire me
        </motion.a>
      )}
    </AnimatePresence>
  );
}
