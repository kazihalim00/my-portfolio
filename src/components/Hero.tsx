"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDown, Bug, Download, Mail, MapPin, Sparkles } from "lucide-react";
import { GithubIcon as Github, LinkedinIcon as Linkedin } from "./icons";
import { profile } from "@/lib/data";

function Typewriter({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[i % words.length];
    const done = !deleting && text === word;
    const empty = deleting && text === "";
    const delay = done ? 1600 : empty ? 300 : deleting ? 35 : 70;
    const t = setTimeout(() => {
      if (done) setDeleting(true);
      else if (empty) {
        setDeleting(false);
        setI((n) => n + 1);
      } else setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, delay);
    return () => clearTimeout(t);
  }, [text, deleting, i, words]);

  return (
    <span className="font-mono text-brand">
      {text}
      <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-blink bg-brand" />
    </span>
  );
}

const reportLines = [
  { name: "builds clean, reliable software", ms: 412 },
  { name: "writes tests before shipping", ms: 238 },
  { name: "reports bugs devs can reproduce", ms: 187 },
  { name: "learns fast (TS + Playwright)", ms: 305 },
  { name: "is ready for your team", ms: 96 },
];

function ReportCard() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= reportLines.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 900 : 550);
    return () => clearTimeout(t);
  }, [shown]);
  const done = shown >= reportLines.length;

  return (
    <div className="card w-full max-w-md overflow-hidden shadow-2xl shadow-brand/10">
      <div className="flex items-center gap-2 border-b border-line/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-fail/80" />
        <span className="h-3 w-3 rounded-full bg-warn/80" />
        <span className="h-3 w-3 rounded-full bg-pass/80" />
        <span className="ml-2 font-mono text-xs text-muted">kazi.spec.ts</span>
      </div>
      <div className="space-y-2 p-4 font-mono text-[12.5px] leading-relaxed sm:text-sm">
        <p className="text-muted">
          <span className="text-brand2">$</span> npx playwright test kazi.spec.ts
        </p>
        <p className="text-muted">Running 5 tests using 1 worker</p>
        {reportLines.slice(0, shown).map((l) => (
          <motion.p key={l.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
            <span className="text-pass">✓</span>
            <span className="flex-1 truncate">Kazi {l.name}</span>
            <span className="text-muted">{l.ms}ms</span>
          </motion.p>
        ))}
        {!done && (
          <p className="flex items-center gap-2 text-muted">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" /> running…
          </p>
        )}
        {done && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg bg-pass/10 px-3 py-2 text-pass">
            5 passed (1.2s) · 0 failed · 0 flaky
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const b1x = useTransform(sx, (v) => v * 40);
  const b1y = useTransform(sy, (v) => v * 40);
  const b2x = useTransform(sx, (v) => v * -30);
  const b2y = useTransform(sy, (v) => v * -30);
  const cardRX = useTransform(sy, (v) => v * -6);
  const cardRY = useTransform(sx, (v) => v * 6);

  return (
    <section
      id="home"
      onMouseMove={(e) => {
        mx.set(e.clientX / window.innerWidth - 0.5);
        my.set(e.clientY / window.innerHeight - 0.5);
      }}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-24"
    >
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <motion.div style={{ x: b1x, y: b1y }} className="pointer-events-none absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full bg-brand/20 blur-[110px]" />
      <motion.div style={{ x: b2x, y: b2y }} className="pointer-events-none absolute -right-24 bottom-0 h-[30rem] w-[30rem] rounded-full bg-brand2/20 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="chip mb-6 gap-2 border-brand/30 bg-brand/10 text-brand"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Open to Junior SDET / QA / Full Stack roles
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]"
          >
            Hi, I&apos;m <span className="gradient-text">Kazi Sunny</span>.
            <br />
            I build software
            <br className="hidden sm:block" /> and <span className="relative whitespace-nowrap">
              break it
              <svg viewBox="0 0 200 12" className="absolute -bottom-1 left-0 w-full text-fail/70" preserveAspectRatio="none" aria-hidden>
                <path d="M2 8 Q 25 2, 50 8 T 100 8 T 150 8 T 198 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>{" "}
            on purpose.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-lg text-muted sm:text-xl"
          >
            <Typewriter words={profile.roles} />
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 max-w-xl text-muted"
          >
            Laravel &amp; Vue developer with real SaaS testing experience, now moving into test automation. This site is a playground: hunt bugs, run a test suite, or type into the terminal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a href="#lab" className="btn-primary">
              <Bug size={16} /> Play Bug Hunt
            </a>
            <a href="#projects" className="btn-ghost">
              <Sparkles size={16} /> See projects
            </a>
            <a href={profile.cv.developer} download className="btn-ghost">
              <Download size={16} /> CV
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex flex-wrap items-center gap-4 text-sm text-muted"
          >
            <span className="flex items-center gap-1.5">
              <MapPin size={15} /> {profile.location}
            </span>
            <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-fg" aria-label="GitHub">
              <Github size={15} /> GitHub
            </a>
            <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-fg" aria-label="LinkedIn">
              <Linkedin size={15} /> LinkedIn
            </a>
            <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 hover:text-fg" aria-label="Email">
              <Mail size={15} /> Email
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{ rotateX: cardRX, rotateY: cardRY, transformPerspective: 1000 }}
          className="flex justify-center lg:justify-end"
        >
          <div className="animate-float w-full max-w-md">
            <ReportCard />
          </div>
        </motion.div>
      </div>

      <a href="#about" aria-label="Scroll to about" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-muted hover:text-fg sm:block">
        <ArrowDown className="animate-bounce" size={20} />
      </a>
    </section>
  );
}
