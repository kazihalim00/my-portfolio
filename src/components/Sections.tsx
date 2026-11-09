"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Briefcase, ExternalLink, GraduationCap, Users, Download, FlaskConical, CodeXml } from "lucide-react";
import { education, experience, leadership, learning, profile, projects, skills, stats, type Project } from "@/lib/data";
import { CountUp, Reveal, Section, SpotlightCard } from "./ui";

/* ---------------- About ---------------- */
export function About() {
  return (
    <Section
      id="about"
      eyebrow="01 · About"
      title={
        <>
          I build <span className="gradient-text">full stack products</span>, end to end.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <SpotlightCard className="h-full p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 font-display text-2xl font-bold text-white dark:text-slate-950">
                {profile.initials}
              </div>
              <div>
                <p className="font-display text-xl font-semibold">{profile.name}</p>
                <p className="text-sm text-muted">{profile.title}</p>
              </div>
            </div>
            <p className="mt-6 leading-relaxed text-muted">{profile.summary}</p>
            <p className="mt-4 leading-relaxed text-muted">
              I enjoy the whole journey: designing the database, writing clean Laravel or FastAPI backends, and building Vue or
              Flutter interfaces people actually like using. Testing real products taught me to think about edge cases before users find them. Outside code, I am the author of five Bangla books.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={profile.cv.developer} download className="btn-primary">
                <Download size={15} /> Developer CV
              </a>
              <a href={profile.cv.qa} download className="btn-ghost">
                <Download size={15} /> QA CV
              </a>
            </div>
          </SpotlightCard>
        </Reveal>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <SpotlightCard className="flex h-full flex-col justify-between p-5">
                <p className="font-display text-3xl font-bold sm:text-4xl">
                  <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-xs leading-snug text-muted sm:text-sm">{s.label}</p>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Experience ---------------- */
export function Experience() {
  return (
    <Section id="experience" eyebrow="02 · Experience" title="Where I have shipped and tested" intro="Real products, real users, real bugs.">
      <div className="relative">
        <div className="absolute bottom-0 left-[19px] top-2 w-px bg-gradient-to-b from-brand via-brand2/50 to-transparent sm:left-[23px]" />
        <div className="space-y-8">
          {experience.map((e, i) => (
            <Reveal key={e.role} delay={i * 0.05}>
              <div className="relative flex gap-4 sm:gap-6">
                <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/30 bg-bg text-brand sm:h-12 sm:w-12">
                  {e.kind === "work" ? <Briefcase size={18} /> : <Award size={18} />}
                </div>
                <SpotlightCard className="flex-1 p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold sm:text-xl">{e.role}</h3>
                      <p className="text-sm text-brand">{e.org}</p>
                    </div>
                    <span className="chip font-mono">{e.period}</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {e.points.map((p) => (
                      <li key={p} className="flex gap-2 text-sm leading-relaxed text-muted">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  {e.link && (
                    <a href={e.link.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                      {e.link.label} <ExternalLink size={13} />
                    </a>
                  )}
                </SpotlightCard>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- Projects ---------------- */
const filters = ["All", "Laravel", "Python", "AI", "Testing"] as const;

function ProjectCard({ p }: { p: Project }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -6, y: ((e.clientX - r.left) / r.width - 0.5) * 6 });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      className="transition-transform duration-200 ease-out"
    >
      <SpotlightCard className="group flex h-full flex-col overflow-hidden">
        <div className={`h-1.5 w-full bg-gradient-to-r ${p.accent}`} />
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold">{p.name}</h3>
              <p className="text-sm text-muted">{p.tagline}</p>
            </div>
            <span className="chip shrink-0 border-brand/30 text-brand">{p.badge}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">{p.description}</p>
          <ul className="mt-4 grid gap-1.5">
            {p.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-pass">✓</span> {h}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-3 pt-6">
            {p.links.length === 0 && <span className="text-xs text-muted">Private research repository</span>}
            {p.links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("#") ? undefined : "_blank"}
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
              >
                {l.label} <ExternalLink size={13} />
              </a>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Projects() {
  const [f, setF] = useState<(typeof filters)[number]>("All");
  const list = projects.filter((p) => f === "All" || p.category.includes(f));
  return (
    <Section id="projects" eyebrow="03 · Projects" title="Things I have built" intro="Filter by stack. Hover a card to tilt it.">
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter projects">
        {filters.map((x) => (
          <button
            key={x}
            role="tab"
            aria-selected={f === x}
            onClick={() => setF(x)}
            className={`relative rounded-full px-4 py-1.5 text-sm transition ${f === x ? "text-white dark:text-slate-950" : "text-muted hover:text-fg"}`}
          >
            {f === x && <motion.span layoutId="proj-filter" className="absolute inset-0 -z-10 rounded-full bg-brand" />}
            {x}
          </button>
        ))}
      </div>
      <motion.div layout className="grid gap-6 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {list.map((p) => (
            <ProjectCard key={p.name} p={p} />
          ))}
        </AnimatePresence>
      </motion.div>
      <GitHubLive />
    </Section>
  );
}

/* ---------------- Live GitHub ---------------- */
type Repo = { name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number; fork: boolean; pushed_at: string };

function GitHubLive() {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [user, setUser] = useState<{ public_repos: number; followers: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetch(`https://api.github.com/users/${profile.github}`, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`https://api.github.com/users/${profile.github}/repos?per_page=100&sort=pushed`, { signal: ctrl.signal }).then((r) =>
        r.ok ? r.json() : Promise.reject()
      ),
    ])
      .then(([u, r]: [{ public_repos: number; followers: number }, Repo[]]) => {
        setUser(u);
        setRepos(r.filter((x) => !x.fork));
      })
      .catch(() => !ctrl.signal.aborted && setError(true));
    return () => ctrl.abort();
  }, []);

  const langs = (repos ?? []).reduce<Record<string, number>>((acc, r) => {
    if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
    return acc;
  }, {});
  const langList = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalLang = langList.reduce((s, [, n]) => s + n, 0) || 1;
  const palette = ["bg-brand", "bg-brand2", "bg-warn", "bg-fail", "bg-sky-400", "bg-pink-400"];

  return (
    <Reveal className="mt-10">
      <SpotlightCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pass opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-pass" />
            </span>
            <h3 className="font-display text-lg font-semibold">Live from GitHub</h3>
          </div>
          <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="font-mono text-sm text-brand hover:underline">
            @{profile.github}
          </a>
        </div>

        {error && <p className="mt-4 text-sm text-muted">GitHub is rate-limiting right now. Visit my profile directly for the latest repositories.</p>}
        {!error && !repos && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-fg/5" />
            ))}
          </div>
        )}
        {repos && (
          <>
            <div className="mt-5 flex flex-wrap gap-6 text-sm">
              <p>
                <span className="font-display text-2xl font-bold">{user?.public_repos ?? repos.length}</span> <span className="text-muted">public repos</span>
              </p>
              <p>
                <span className="font-display text-2xl font-bold">{user?.followers ?? 0}</span> <span className="text-muted">followers</span>
              </p>
            </div>
            {langList.length > 0 && (
              <>
                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
                  {langList.map(([l, n], i) => (
                    <div key={l} className={palette[i]} style={{ width: `${(n / totalLang) * 100}%` }} title={l} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {langList.map(([l, n], i) => (
                    <span key={l} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${palette[i]}`} /> {l} · {n}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {repos.slice(0, 6).map((r) => (
                <a
                  key={r.name}
                  href={r.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-line/10 p-4 transition hover:-translate-y-0.5 hover:border-brand/40"
                >
                  <p className="truncate font-mono text-sm font-medium">{r.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{r.description || "No description yet"}</p>
                  <p className="mt-2 flex gap-3 text-xs text-muted">
                    {r.language && <span>{r.language}</span>}
                    <span>★ {r.stargazers_count}</span>
                    <span>{new Date(r.pushed_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                  </p>
                </a>
              ))}
            </div>
          </>
        )}
      </SpotlightCard>
    </Reveal>
  );
}

/* ---------------- Skills ---------------- */
export function Skills() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <Section id="skills" eyebrow="04 · Skills" title="Toolbox" intro="What I build with every day, plus the testing skills I bring to every project.">
      <div className="grid gap-6 lg:grid-cols-3">
        {(Object.entries(skills) as [string, string[]][]).map(([group, list], gi) => (
          <Reveal key={group} delay={gi * 0.08}>
            <SpotlightCard className="h-full p-6">
              <div className="flex items-center gap-2">
                {group === "Testing" ? <FlaskConical size={18} className="text-brand" /> : <CodeXml size={18} className="text-brand2" />}
                <h3 className="font-display text-lg font-semibold">{group}</h3>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {list.map((s) => (
                  <motion.span
                    key={s}
                    whileHover={{ y: -3, scale: 1.05 }}
                    onHoverStart={() => setHovered(s)}
                    onHoverEnd={() => setHovered(null)}
                    className={`cursor-default rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      hovered === s ? "border-brand bg-brand/10 text-brand" : "border-line/10 bg-surface/50"
                    }`}
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>
        ))}
        <Reveal delay={0.16}>
          <SpotlightCard className="h-full p-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-warn" />
              </span>
              <h3 className="font-display text-lg font-semibold">Currently learning</h3>
            </div>
            <ol className="mt-5 space-y-3">
              {learning.map((l, i) => (
                <li key={l.name} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs ${
                      l.stage === "Learning now" ? "bg-warn/15 text-warn" : "bg-fg/5 text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{l.name}</span>
                  <span className={`text-xs ${l.stage === "Learning now" ? "text-warn" : "text-muted"}`}>{l.stage}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 font-mono text-[11px] text-muted/70">
              {"// psst: try `sudo hire kazi` in the terminal"}
            </p>
          </SpotlightCard>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------------- Education & Leadership ---------------- */
export function Journey() {
  return (
    <Section id="journey" eyebrow="07 · Beyond code" title="Education & leadership">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <SpotlightCard className="h-full p-6">
            <GraduationCap className="text-brand" />
            <h3 className="mt-4 font-display text-xl font-semibold">{education.degree}</h3>
            <p className="text-sm text-brand">{education.school}</p>
            <p className="mt-1 font-mono text-xs text-muted">{education.period}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">{education.detail}</p>
            <div className="mt-6 rounded-xl bg-brand/10 p-4">
              <p className="font-display text-4xl font-bold text-brand">3.96</p>
              <p className="text-xs text-muted">CGPA out of 4.00</p>
            </div>
          </SpotlightCard>
        </Reveal>
        <Reveal delay={0.08}>
          <SpotlightCard className="h-full p-6">
            <Users className="text-brand2" />
            <ul className="mt-4 divide-y divide-line/10">
              {leadership.map((l) => (
                <li key={l.role + l.org} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <div>
                    <p className="text-sm font-medium">{l.role}</p>
                    <p className="text-xs text-muted">{l.org}</p>
                  </div>
                  <span className="font-mono text-xs text-muted">{l.period}</span>
                </li>
              ))}
            </ul>
          </SpotlightCard>
        </Reveal>
      </div>
    </Section>
  );
}
