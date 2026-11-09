"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import { Command, Menu, Moon, Sun, Trophy, X } from "lucide-react";
import { sections, profile } from "@/lib/data";
import { useApp, ACHIEVEMENTS } from "./Providers";

export function Nav() {
  const { theme, toggleTheme, setPaletteOpen, unlocked, setAchievementsOpen } = useApp();
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
    };
  }, []);

  const total = Object.keys(ACHIEVEMENTS).length;

  return (
    <>
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand to-brand2" />
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
        <nav
          className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 py-2 transition-all duration-300 sm:px-4 ${
            scrolled ? "glass mx-3 shadow-lg sm:mx-auto" : "mx-3 sm:mx-auto"
          }`}
          aria-label="Main"
        >
          <a href="#home" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand2 text-sm text-white dark:text-slate-950">
              {profile.initials}
            </span>
            <span className="hidden sm:inline">{profile.short}</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {sections.slice(1).map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors ${active === s.id ? "text-fg" : "text-muted hover:text-fg"}`}
                >
                  {active === s.id && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-lg bg-fg/5 ring-1 ring-fg/10" />
                  )}
                  {s.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-line/10 px-2.5 py-1.5 text-xs text-muted transition hover:border-brand/40 hover:text-fg sm:flex"
              aria-label="Open command palette"
            >
              <Command size={13} /> <span className="font-mono">Ctrl K</span>
            </button>
            <button
              onClick={() => setAchievementsOpen(true)}
              className="relative grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-fg/5 hover:text-warn"
              aria-label={`Achievements: ${unlocked.length} of ${total}`}
              title="Achievements"
            >
              <Trophy size={17} />
              {unlocked.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-slate-950">
                  {unlocked.length}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-fg/5 hover:text-fg"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <button
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-fg/5 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-bg/80 backdrop-blur-xl lg:hidden"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="mx-4 mt-4 rounded-2xl glass p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex justify-end">
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-fg/5">
                  <X size={18} />
                </button>
              </div>
              <ul className="grid gap-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => setOpen(false)}
                      className={`block rounded-xl px-4 py-3 font-display text-lg ${active === s.id ? "bg-brand/10 text-brand" : "hover:bg-fg/5"}`}
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setOpen(false);
                  setPaletteOpen(true);
                }}
                className="btn-ghost mt-3 w-full"
              >
                <Command size={15} /> Command palette
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
