"use client";

import { useEffect, useRef, useState } from "react";
import { education, experience, profile, projects, skills } from "@/lib/data";
import { useApp } from "../Providers";
import { useLab } from "./LabState";
import { BUGS } from "@/lib/bugs";
import { books, penName } from "@/lib/books";

type Out = { cmd?: string; lines: { t: string; c?: string }[] };

const COMMANDS = ["help", "whoami", "about", "experience", "projects", "skills", "education", "contact", "cv", "github", "linkedin", "bughunt", "books", "read", "stats", "theme", "clear", "date", "echo", "ls", "cat", "sudo", "exit"];

function goto(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function Terminal({ onGoLab }: { onGoLab?: (tab: "hunt" | "tests") => void }) {
  const { toggleTheme, unlock, toast } = useApp();
  const lab = useLab();
  const [history, setHistory] = useState<Out[]>([
    {
      lines: [
        { t: "kazi-os v2.0 (tty1)", c: "text-slate-500" },
        { t: "Welcome! Type 'help' to see what I can do. Tab completes, ↑/↓ browse history.", c: "text-emerald-400" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [pi, setPi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    unlock("hacker");
    setPast((p) => [cmd, ...p].slice(0, 50));
    setPi(-1);
    const [name, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ");
    const L = (t: string, c?: string) => ({ t, c });
    let lines: Out["lines"] = [];

    switch (name.toLowerCase()) {
      case "help":
        lines = [
          L("Available commands:", "text-emerald-400"),
          L("  whoami       who is Kazi?"),
          L("  about        short summary"),
          L("  experience   work & training"),
          L("  projects     things I built"),
          L("  skills       my toolbox"),
          L("  education    degree & CGPA"),
          L("  contact      how to reach me"),
          L("  cv           download my CV"),
          L("  github       open GitHub"),
          L("  linkedin     open LinkedIn"),
          L("  books        books I have written"),
          L("  read <book>  open a free book"),
          L("  bughunt      jump into the Bug Hunt game"),
          L("  stats        your Bug Hunt progress"),
          L("  theme        toggle dark/light"),
          L("  clear        clear the screen"),
          L("  …and a few hidden ones 👀", "text-slate-500"),
        ];
        break;
      case "whoami":
        lines = [L(`${profile.name}`, "text-emerald-400"), L(`${profile.title} · ${profile.location}`)];
        break;
      case "about":
        lines = [L(profile.summary)];
        break;
      case "experience":
        lines = experience.flatMap((e) => [L(`▸ ${e.role} @ ${e.org} (${e.period})`, "text-indigo-300"), ...e.points.slice(0, 2).map((p) => L(`  - ${p}`))]);
        break;
      case "projects":
        lines = projects.flatMap((p) => [L(`▸ ${p.name}: ${p.tagline}`, "text-indigo-300"), L(`  ${p.tags.join(" · ")}`, "text-slate-500")]);
        break;
      case "skills":
        lines = Object.entries(skills).flatMap(([g, list]) => [L(`${g}:`, "text-emerald-400"), L(`  ${list.join(", ")}`)]);
        break;
      case "education":
        lines = [L(education.degree, "text-indigo-300"), L(`${education.school} · ${education.period}`), L(education.detail)];
        break;
      case "contact":
        lines = [L(`email    ${profile.email}`), L(`linkedin ${profile.linkedinUrl}`), L(`github   ${profile.githubUrl}`), L("or scroll to the contact form ↓", "text-slate-500")];
        break;
      case "cv": {
        const qa = arg.toLowerCase().includes("qa");
        const a = document.createElement("a");
        a.href = qa ? profile.cv.qa : profile.cv.developer;
        a.download = "";
        a.click();
        lines = [L(`Downloading ${qa ? "QA" : "Developer"} CV… (try 'cv qa' for the QA version)`, "text-emerald-400")];
        break;
      }
      case "github":
        window.open(profile.githubUrl, "_blank", "noopener");
        lines = [L("Opening GitHub…")];
        break;
      case "linkedin":
        window.open(profile.linkedinUrl, "_blank", "noopener");
        lines = [L("Opening LinkedIn…")];
        break;
      case "books":
        lines = [
          L(`Books by ${penName}:`, "text-emerald-400"),
          ...books.map((b) => L(`▸ ${b.title} (${b.year})${b.pdf ? "  → read free: /read/" + b.slug : ""}`, b.pdf ? "text-indigo-300" : undefined)),
        ];
        break;
      case "read":
        if (books.some((b) => b.slug === arg && b.pdf)) {
          window.location.href = `/read/${arg}`;
          lines = [L(`Opening ${arg}…`, "text-emerald-400")];
        } else lines = [L("usage: read pretend | read paper-addopanto", "text-slate-500")];
        break;
      case "bughunt":
        onGoLab?.("hunt");
        lines = [L("Loading ShopLite… find all 8 bugs! 🐞", "text-emerald-400")];
        break;
      case "stats":
        lines = [L(`Bugs found: ${lab.found.length}/${BUGS.length}`), L(`Score: ${lab.score}`), L(`Hints used: ${lab.hints.length}`)];
        break;
      case "theme":
        toggleTheme();
        lines = [L("Theme toggled ✨")];
        break;
      case "clear":
        setHistory([]);
        setInput("");
        return;
      case "date":
        lines = [L(new Date().toString())];
        break;
      case "echo":
        lines = [L(arg)];
        break;
      case "ls":
        lines = [L("about.md  experience/  projects/  skills.json  cv.pdf  secret.txt", "text-indigo-300")];
        break;
      case "cat":
        if (arg === "secret.txt") {
          unlock("secret");
          lines = [L("🤫 Secret: the best bug reports have clear steps, expected and actual.", "text-amber-300"), L("Also: Kazi drinks too much tea while debugging. ☕")];
        } else if (arg === "about.md") lines = [L(profile.summary)];
        else if (arg === "skills.json") lines = [L(JSON.stringify(skills, null, 0))];
        else lines = [L(`cat: ${arg || "(missing file)"}: No such file`, "text-red-400")];
        break;
      case "sudo":
        if (/hire\s+kazi/i.test(arg)) {
          unlock("secret");
          lines = [
            L("[sudo] password for recruiter: ********", "text-slate-500"),
            L("✓ Permission granted. Excellent decision.", "text-emerald-400"),
            L(`Opening email to ${profile.email}…`),
          ];
          setTimeout(() => (window.location.href = `mailto:${profile.email}?subject=Let's%20talk%20about%20a%20role`), 900);
        } else if (/rm\s+-rf/.test(arg)) {
          lines = [L("Nice try. This portfolio has tests. 🛡️", "text-amber-300")];
        } else lines = [L("Permission denied. (hint: sudo hire kazi)", "text-red-400")];
        break;
      case "exit":
        lines = [L("There is no escape. Try 'sudo hire kazi' instead. 😄", "text-amber-300")];
        break;
      case "hello":
      case "hi":
        lines = [L("Hey there! 👋 Thanks for visiting.")];
        break;
      case "coffee":
      case "tea":
        unlock("secret");
        lines = [L("☕ Brewing… done. Kazi's productivity +20%.", "text-amber-300")];
        toast({ title: "☕ Tea break", desc: "You found a hidden command.", tone: "info" });
        break;
      default:
        lines = [L(`command not found: ${name}. Type 'help'.`, "text-red-400")];
    }
    setHistory((h) => [...h, { cmd, lines }]);
    setInput("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") run(input);
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = Math.min(pi + 1, past.length - 1);
      if (n >= 0) {
        setPi(n);
        setInput(past[n]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = pi - 1;
      setPi(Math.max(n, -1));
      setInput(n >= 0 ? past[n] : "");
    } else if (e.key === "Tab") {
      e.preventDefault();
      const m = COMMANDS.filter((c) => c.startsWith(input.toLowerCase()));
      if (m.length === 1) setInput(m[0] + " ");
      else if (m.length > 1) setHistory((h) => [...h, { cmd: input, lines: [{ t: m.join("  "), c: "text-slate-500" }] }]);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  const quick = ["help", "whoami", "projects", "skills", "contact", "sudo hire kazi"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q} onClick={() => run(q)} className="chip font-mono transition hover:border-brand/40 hover:text-brand">
            {q}
          </button>
        ))}
      </div>
      <div
        className="overflow-hidden rounded-xl border border-line/10 bg-[#070a14] text-slate-200 shadow-2xl"
        onClick={() => inputRef.current?.focus({ preventScroll: true })}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
          <span className="ml-2 font-mono text-[11px] text-slate-400">visitor@kazi-os: ~</span>
        </div>
        <div ref={boxRef} className="scrollbar-thin h-[380px] overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed">
          {history.map((h, i) => (
            <div key={i} className="mb-2">
              {h.cmd !== undefined && (
                <p>
                  <span className="text-emerald-400">visitor@kazi</span>
                  <span className="text-slate-500">:~$</span> {h.cmd}
                </p>
              )}
              {h.lines.map((l, j) => (
                <p key={j} className={`whitespace-pre-wrap break-words ${l.c ?? ""}`}>
                  {l.t || " "}
                </p>
              ))}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="shrink-0">
              <span className="text-emerald-400">visitor@kazi</span>
              <span className="text-slate-500">:~$</span>
            </span>
            <label htmlFor="term-input" className="sr-only">
              Terminal command
            </label>
            <input
              id="term-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-slate-100 caret-emerald-400 outline-none"
              placeholder="type a command…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { goto };
