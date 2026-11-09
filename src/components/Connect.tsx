"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Mail, MapPin, Send, Download } from "lucide-react";
import { profile } from "@/lib/data";
import { Section, Reveal, SpotlightCard } from "./ui";
import { load, save, useApp } from "./Providers";
import { GithubIcon, LinkedinIcon } from "./icons";

/* ---------------- Guestbook ---------------- */
type Note = { name: string; message: string; role: string; emoji: string; at: number };
const ROLES = ["Recruiter", "Developer", "QA / Tester", "Student", "Friend", "Visitor"];
const EMOJIS = ["👋", "🔥", "🚀", "🐞", "💚", "⭐"];

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function Guestbook() {
  const { unlock } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("Visitor");
  const [emoji, setEmoji] = useState("👋");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/guestbook", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok && j.enabled) {
          setOnline(true);
          setNotes(j.notes);
        } else throw new Error();
      })
      .catch(() => {
        setOnline(false);
        setNotes(load<Note[]>("local-guestbook", []));
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || message.trim().length < 2) {
      setState("error");
      setErr("Please add your name and a short message.");
      return;
    }
    setState("sending");
    const draft: Note = { name: name.trim().slice(0, 32), message: message.trim().slice(0, 280), role, emoji, at: Date.now() };
    if (online) {
      try {
        const r = await fetch("/api/guestbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, website }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not post");
        setNotes((n) => [j.note ?? draft, ...n]);
      } catch (e) {
        setState("error");
        setErr(e instanceof Error ? e.message : "Could not post");
        return;
      }
    } else {
      const next = [draft, ...load<Note[]>("local-guestbook", [])].slice(0, 30);
      save("local-guestbook", next);
      setNotes(next);
    }
    setMessage("");
    setState("idle");
    unlock("signer");
  };

  return (
    <Section id="guestbook" eyebrow="09 · Guestbook" title="Leave a mark" intro="Recruiter, developer or just passing by? Say hi. Your note appears on the wall instantly.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <SpotlightCard className="p-6">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label htmlFor="gb-name" className="mb-1 block text-xs font-medium text-muted">
                  Name
                </label>
                <input id="gb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} className="input" placeholder="Your name" />
              </div>
              <div>
                <p className="mb-1 block text-xs font-medium text-muted">I am a…</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      aria-pressed={role === r}
                      className={`rounded-full border px-3 py-1 text-xs transition ${role === r ? "border-brand bg-brand/10 text-brand" : "border-line/10 text-muted hover:text-fg"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="gb-msg" className="mb-1 block text-xs font-medium text-muted">
                  Message
                </label>
                <textarea
                  id="gb-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={280}
                  rows={3}
                  className="input resize-none"
                  placeholder="Great portfolio! I found 7 bugs…"
                />
                <p className="mt-1 text-right font-mono text-[10px] text-muted">{message.length}/280</p>
              </div>
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden name="website" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1" role="radiogroup" aria-label="Pick an emoji">
                  {EMOJIS.map((em) => (
                    <button
                      type="button"
                      key={em}
                      role="radio"
                      aria-checked={emoji === em}
                      onClick={() => setEmoji(em)}
                      className={`grid h-8 w-8 place-items-center rounded-lg text-base transition ${emoji === em ? "scale-110 bg-brand/15 ring-1 ring-brand" : "hover:bg-fg/5"}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                <button disabled={state === "sending"} className="btn-primary shrink-0">
                  <Send size={15} /> Sign
                </button>
              </div>
              {state === "error" && <p className="text-xs text-fail">{err}</p>}
              {online === false && <p className="text-[11px] text-muted">Shared wall is offline right now, so your note is saved on this device.</p>}
            </form>
          </SpotlightCard>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="scrollbar-thin grid max-h-[460px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {notes.length === 0 && (
                <p className="col-span-full rounded-2xl border border-dashed border-line/15 p-8 text-center text-sm text-muted">
                  The wall is empty. Be the first to sign! ✍️
                </p>
              )}
              {notes.map((n) => (
                <motion.div
                  key={`${n.name}-${n.at}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{n.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{n.name}</p>
                      <p className="text-[11px] text-muted">
                        {n.role} · {timeAgo(n.at)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 break-words text-sm text-muted">{n.message}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------------- Contact ---------------- */
const W3F_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

export function Contact() {
  const { toast } = useApp();
  const [form, setForm] = useState({ name: "", email: "", subject: "Job opportunity", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Enter a valid email"; // unlike ShopLite 😉
    if (form.message.trim().length < 10) e.message = "Message should be at least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (state === "sending" || !validate()) return;
    if (!W3F_KEY) {
      const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
      window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(form.subject)}&body=${body}`;
      return;
    }
    setState("sending");
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: W3F_KEY, ...form, from_name: "Portfolio contact form" }),
      });
      const j = await r.json();
      if (!j.success) throw new Error();
      setState("sent");
      setForm({ name: "", email: "", subject: "Job opportunity", message: "" });
    } catch {
      setState("error");
    }
  };

  const copy = () =>
    navigator.clipboard?.writeText(profile.email).then(
      () => toast({ title: "Email copied", desc: profile.email, tone: "info" }),
      () => {}
    );

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <Section
      id="contact"
      eyebrow="10 · Contact"
      title={
        <>
          Let&apos;s build <span className="gradient-text">(and test)</span> something.
        </>
      }
      intro="Hiring for a junior SDET, QA or full stack role? I reply within a day."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <div className="flex h-full flex-col gap-3">
            <SpotlightCard className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted">Email</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <a href={`mailto:${profile.email}`} className="truncate text-sm font-medium hover:text-brand">
                  {profile.email}
                </a>
                <button onClick={copy} className="rounded-lg p-2 text-muted hover:bg-fg/5 hover:text-fg" aria-label="Copy email">
                  <Copy size={15} />
                </button>
              </div>
            </SpotlightCard>
            <div className="grid grid-cols-2 gap-3">
              <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="card flex items-center gap-2 p-4 text-sm transition hover:-translate-y-0.5 hover:border-brand/40">
                <LinkedinIcon /> LinkedIn
              </a>
              <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="card flex items-center gap-2 p-4 text-sm transition hover:-translate-y-0.5 hover:border-brand/40">
                <GithubIcon /> GitHub
              </a>
            </div>
            <SpotlightCard className="flex items-center gap-3 p-5 text-sm text-muted">
              <MapPin size={16} className="text-brand" /> {profile.location} · open to remote & on-site
            </SpotlightCard>
            <div className="grid grid-cols-2 gap-3">
              <a href={profile.cv.developer} download className="btn-ghost">
                <Download size={15} /> Dev CV
              </a>
              <a href={profile.cv.qa} download className="btn-ghost">
                <Download size={15} /> QA CV
              </a>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <SpotlightCard className="p-6">
            {state === "sent" ? (
              <div className="grid min-h-[300px] place-items-center text-center">
                <div>
                  <p className="text-4xl">✅</p>
                  <p className="mt-3 font-display text-xl font-semibold">Message sent!</p>
                  <p className="mt-1 text-sm text-muted">Thanks for reaching out. I&apos;ll get back to you soon.</p>
                  <button onClick={() => setState("idle")} className="btn-ghost mt-5">
                    Send another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-name" className="mb-1 block text-xs font-medium text-muted">
                    Name
                  </label>
                  <input id="c-name" {...field("name")} className="input" autoComplete="name" aria-invalid={!!errors.name} />
                  {errors.name && <p className="mt-1 text-xs text-fail">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="c-email" className="mb-1 block text-xs font-medium text-muted">
                    Email
                  </label>
                  <input id="c-email" type="email" {...field("email")} className="input" autoComplete="email" aria-invalid={!!errors.email} />
                  {errors.email && <p className="mt-1 text-xs text-fail">{errors.email}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="c-subject" className="mb-1 block text-xs font-medium text-muted">
                    Subject
                  </label>
                  <select id="c-subject" {...field("subject")} className="input">
                    <option>Job opportunity</option>
                    <option>Freelance project</option>
                    <option>Collaboration</option>
                    <option>Just saying hi</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="c-msg" className="mb-1 block text-xs font-medium text-muted">
                    Message
                  </label>
                  <textarea id="c-msg" rows={5} {...field("message")} className="input resize-none" aria-invalid={!!errors.message} />
                  {errors.message && <p className="mt-1 text-xs text-fail">{errors.message}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <button disabled={state === "sending"} className="btn-primary">
                    {state === "sending" ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : W3F_KEY ? (
                      <Send size={15} />
                    ) : (
                      <Mail size={15} />
                    )}
                    {state === "sending" ? "Sending…" : "Send message"}
                  </button>
                  {state === "error" && <p className="text-xs text-fail">Something went wrong. Please email me directly.</p>}
                </div>
              </form>
            )}
          </SpotlightCard>
        </Reveal>
      </div>
    </Section>
  );
}

export function Footer() {
  const { setPaletteOpen } = useApp();
  return (
    <footer className="border-t border-line/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <p>
          © {new Date().getFullYear()} {profile.name}. Built with Next.js, TypeScript & Tailwind.
        </p>
        <button onClick={() => setPaletteOpen(true)} className="font-mono text-xs hover:text-brand">
          press Ctrl+K anywhere ⌘
        </button>
      </div>
    </footer>
  );
}
