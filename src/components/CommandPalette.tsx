"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bug, Copy, Download, FlaskConical, Mail, Moon, Search, SquareTerminal, Trophy, Hash, ExternalLink } from "lucide-react";
import { profile, sections } from "@/lib/data";
import { ACHIEVEMENTS, useApp } from "./Providers";
import { openLab } from "./lab/Lab";

type Action = { id: string; label: string; group: string; icon: React.ReactNode; run: () => void; keywords?: string };

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, toggleTheme, toast, setAchievementsOpen } = useApp();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: Action[] = useMemo(
    () => [
      ...sections.map((s) => ({
        id: `go-${s.id}`,
        label: `Go to ${s.label}`,
        group: "Navigate",
        icon: <Hash size={15} />,
        run: () => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }),
      })),
      { id: "hunt", label: "Play Bug Hunt", group: "QA Lab", icon: <Bug size={15} />, run: () => openLab("hunt"), keywords: "game bugs" },
      { id: "tests", label: "Run the test suite", group: "QA Lab", icon: <FlaskConical size={15} />, run: () => openLab("tests"), keywords: "playwright" },
      { id: "term", label: "Open terminal", group: "QA Lab", icon: <SquareTerminal size={15} />, run: () => openLab("terminal"), keywords: "cli shell" },
      { id: "cv", label: "Download Developer CV", group: "Actions", icon: <Download size={15} />, run: () => window.open(profile.cv.developer, "_blank"), keywords: "resume pdf" },
      { id: "cvqa", label: "Download QA CV", group: "Actions", icon: <Download size={15} />, run: () => window.open(profile.cv.qa, "_blank"), keywords: "resume pdf sdet" },
      {
        id: "copy",
        label: "Copy email address",
        group: "Actions",
        icon: <Copy size={15} />,
        run: () => {
          navigator.clipboard?.writeText(profile.email).then(
            () => toast({ title: "Email copied", desc: profile.email, tone: "info" }),
            () => toast({ title: "Copy failed", desc: profile.email, tone: "info" })
          );
        },
      },
      { id: "mail", label: "Send an email", group: "Actions", icon: <Mail size={15} />, run: () => (window.location.href = `mailto:${profile.email}`) },
      { id: "theme", label: "Toggle theme", group: "Actions", icon: <Moon size={15} />, run: toggleTheme, keywords: "dark light" },
      { id: "ach", label: `View achievements (${Object.keys(ACHIEVEMENTS).length})`, group: "Actions", icon: <Trophy size={15} />, run: () => setAchievementsOpen(true) },
      { id: "gh", label: "Open GitHub", group: "Links", icon: <ExternalLink size={15} />, run: () => window.open(profile.githubUrl, "_blank", "noopener") },
      { id: "li", label: "Open LinkedIn", group: "Links", icon: <ExternalLink size={15} />, run: () => window.open(profile.linkedinUrl, "_blank", "noopener") },
    ],
    [toggleTheme, toast, setAchievementsOpen]
  );

  const filtered = actions.filter((a) => `${a.label} ${a.group} ${a.keywords ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  useEffect(() => setSel(0), [q]);

  const exec = (a: Action) => {
    setPaletteOpen(false);
    setTimeout(a.run, 60);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setPaletteOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[sel]) exec(filtered[sel]);
  };

  let lastGroup = "";

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-bg/60 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setPaletteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="glass w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKey}
          >
            <div className="flex items-center gap-3 border-b border-line/10 px-4">
              <Search size={17} className="text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a command or search…"
                aria-label="Search commands"
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <kbd className="rounded-md border border-line/15 px-1.5 py-0.5 font-mono text-[10px] text-muted">ESC</kbd>
            </div>
            <ul className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No results</li>}
              {filtered.map((a, i) => {
                const header = a.group !== lastGroup ? a.group : null;
                lastGroup = a.group;
                return (
                  <li key={a.id}>
                    {header && <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{header}</p>}
                    <button
                      role="option"
                      aria-selected={i === sel}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => exec(a)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === sel ? "bg-brand/10 text-brand" : "text-fg"}`}
                    >
                      <span className={i === sel ? "text-brand" : "text-muted"}>{a.icon}</span>
                      <span className="flex-1">{a.label}</span>
                      {i === sel && <ArrowRight size={14} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AchievementsModal() {
  const { achievementsOpen, setAchievementsOpen, unlocked } = useApp();
  const all = Object.entries(ACHIEVEMENTS) as [keyof typeof ACHIEVEMENTS, { title: string; desc: string }][];
  return (
    <AnimatePresence>
      {achievementsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-bg/60 px-4 backdrop-blur-sm"
          onClick={() => setAchievementsOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setAchievementsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Achievements"
            className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-xl font-bold">
                <Trophy className="text-warn" size={20} /> Achievements
              </h3>
              <span className="font-mono text-sm text-muted">
                {unlocked.length}/{all.length}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10">
              <div className="h-full bg-warn transition-all" style={{ width: `${(unlocked.length / all.length) * 100}%` }} />
            </div>
            <ul className="mt-5 grid gap-2">
              {all.map(([id, a]) => {
                const got = unlocked.includes(id);
                return (
                  <li key={id} className={`flex items-center gap-3 rounded-xl border p-3 ${got ? "border-warn/30 bg-warn/5" : "border-line/10 opacity-60"}`}>
                    <span className="text-xl">{got ? "🏆" : "🔒"}</span>
                    <div>
                      <p className="text-sm font-semibold">{got ? a.title : "???"}</p>
                      <p className="text-xs text-muted">{a.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button autoFocus onClick={() => setAchievementsOpen(false)} className="btn-ghost mt-5 w-full">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
