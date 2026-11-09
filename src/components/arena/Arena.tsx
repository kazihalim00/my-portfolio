"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, Crosshair, Database, Flame, Medal, Play, RotateCcw, Send, Sparkles, Terminal as TermIcon, Timer, X } from "lucide-react";
import {
  BUG_QS, GAMES, LEVELS, OUT_QS, SQL_QS, SQL_SCHEMA, dailyQuestion, pool, scoreRound,
  type Answer, type BugQ, type GameId, type Level, type OutQ, type SqlQ,
} from "@/lib/arena";
import { load, save, useApp } from "../Providers";
import { Reveal, Section } from "../ui";

type Pick = Answer & { pick?: number };
const GAME_TABS: { id: GameId; icon: typeof Crosshair }[] = [
  { id: "bugspot", icon: Crosshair },
  { id: "output", icon: TermIcon },
  { id: "sql", icon: Database },
];
const LEVEL_STYLE: Record<Level, string> = { easy: "text-pass", medium: "text-warn", hard: "text-fail" };

/** Renders `inline code` inside explanation text. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((p, i) =>
        p.startsWith("`") ? (
          <code key={i} className="rounded bg-fg/10 px-1 py-0.5 font-mono text-[0.92em]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/* ---------------- shared session streak ---------------- */
const StreakCtx = createContext<{ streak: number; bump: (ok: boolean) => void }>({ streak: 0, bump: () => {} });

/* ---------------- question views ---------------- */
function CodeBox({ lines, lang, children }: { lines: string[]; lang: string; children?: (line: string, i: number) => React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line/10 bg-[#070a14] text-slate-200">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 font-mono text-[11px] text-slate-400">
        <span>{lang}</span>
      </div>
      <div className="scrollbar-thin overflow-x-auto py-2 font-mono text-[12.5px] leading-relaxed">
        {lines.map((l, i) =>
          children ? (
            children(l, i)
          ) : (
            <div key={i} className="flex whitespace-pre px-3">
              <span className="mr-3 w-4 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
              <span>{l || " "}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function BugView({ q, pick, reveal, onPick }: { q: BugQ; pick?: number; reveal: boolean; onPick: (i: number) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm">
        <span className="text-muted">Goal: </span>
        {q.task}
      </p>
      <CodeBox lines={q.lines} lang={q.lang}>
        {(l, i) => {
          const isBug = reveal && i === q.bug;
          const wrong = reveal && pick === i && i !== q.bug;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => onPick(i)}
              aria-label={`Line ${i + 1}`}
              data-line={i}
              className={`flex w-full min-w-max whitespace-pre px-3 text-left transition ${
                isBug ? "bg-emerald-500/20" : wrong ? "bg-red-500/25" : "hover:bg-white/[0.06] disabled:hover:bg-transparent"
              }`}
            >
              <span className="mr-3 w-4 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
              <span>{l || " "}</span>
              {isBug && <span className="ml-3 text-emerald-400">← bug</span>}
            </button>
          );
        }}
      </CodeBox>
      {!reveal && <p className="mt-2 text-xs text-muted">Click the line with the bug.</p>}
    </div>
  );
}

function OutView({ q, pick, reveal, onPick }: { q: OutQ; pick?: number; reveal: boolean; onPick: (i: number) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted">What is the output?</p>
      <CodeBox lines={q.lines} lang={q.lang} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const right = reveal && i === q.answer;
          const wrong = reveal && pick === i && i !== q.answer;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => onPick(i)}
              className={`rounded-xl border px-3 py-2.5 text-left font-mono text-sm transition ${
                right ? "border-pass/50 bg-pass/15" : wrong ? "border-fail/50 bg-fail/15" : "border-line/10 hover:border-brand/40 hover:bg-brand/5"
              }`}
            >
              <span className="mr-2 text-muted">{"ABCD"[i]}.</span>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Rows = Record<string, unknown>[];
function ResultTable({ rows }: { rows: Rows }) {
  if (!rows.length) return <p className="text-xs text-muted">0 rows</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="scrollbar-thin max-h-48 overflow-auto rounded-lg border border-line/10">
      <table className="w-full font-mono text-xs">
        <thead className="bg-fg/[0.04] text-left text-muted">
          <tr>{cols.map((c) => <th key={c} className="px-2 py-1 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line/10">
              {cols.map((c) => <td key={c} className="px-2 py-1">{String(r[c] ?? "NULL")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SqlView({ q, reveal, ok, onSubmit }: { q: SqlQ; reveal: boolean; ok?: boolean; onSubmit: (ok: boolean) => void }) {
  const [sql, setSql] = useState("SELECT ");
  const [out, setOut] = useState<{ rows?: Rows; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSql("SELECT ");
    setOut(null);
  }, [q.id]);

  const run = async (submit: boolean) => {
    setBusy(true);
    const { runSql, sameResult } = await import("@/lib/sqlEngine");
    const res = await runSql(sql);
    setBusy(false);
    if ("error" in res) return setOut({ error: res.error });
    setOut({ rows: res.rows });
    if (submit) {
      const exp = await runSql(q.expected);
      onSubmit("rows" in exp && sameResult(res.rows, exp.rows, q.ordered));
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{q.task}</p>
      <div className="mb-3 flex flex-wrap gap-2 font-mono text-[11px] text-muted">
        {Object.entries(SQL_SCHEMA).map(([t, d]) => (
          <span key={t} className="chip">
            <b className="text-fg">{t}</b>({d.cols.join(", ")})
          </span>
        ))}
      </div>
      <label htmlFor={`sql-${q.id}`} className="sr-only">
        SQL query
      </label>
      <textarea
        id={`sql-${q.id}`}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!reveal) run(false);
          }
        }}
        disabled={reveal}
        spellCheck={false}
        rows={4}
        className="w-full rounded-xl border border-line/10 bg-[#070a14] p-3 font-mono text-[13px] text-slate-100 caret-emerald-400 outline-none focus:border-brand/50"
      />
      {!reveal && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => run(false)} disabled={busy} className="btn-ghost px-3 py-1.5 text-sm">
            <Play size={14} /> Run
          </button>
          <button type="button" onClick={() => run(true)} disabled={busy} className="btn-primary px-3 py-1.5 text-sm">
            <Check size={14} /> Submit answer
          </button>
          <span className="text-[11px] text-muted">Ctrl+Enter runs. Hint: {q.hint}</span>
        </div>
      )}
      {out?.error && <p className="mt-2 rounded-lg bg-fail/10 px-3 py-2 font-mono text-xs text-fail">{out.error}</p>}
      {out?.rows && (
        <div className="mt-3">
          <ResultTable rows={out.rows} />
        </div>
      )}
      {reveal && !ok && (
        <p className="mt-3 text-xs text-muted">
          One correct solution: <code className="rounded bg-fg/10 px-1 py-0.5 font-mono">{q.expected}</code>
        </p>
      )}
    </div>
  );
}

/* ---------------- score submit ---------------- */
type LocalBoard = Record<string, Partial<Record<GameId, number>>>;
function saveLocal(name: string, game: GameId, score: number) {
  const b = load<LocalBoard>("arena-local", {});
  const me = b[name] ?? {};
  me[game] = Math.max(me[game] ?? 0, score);
  b[name] = me;
  save("arena-local", b);
}

function SubmitScore({ game, answers, score }: { game: GameId; answers: Pick[]; score: number }) {
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => setName(load<string>("arena-name", "")), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().slice(0, 24);
    if (!n) return;
    save("arena-name", n);
    setState("sending");
    try {
      const r = await fetch("/api/arena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, game, answers: answers.map(({ id, pick, ok, ms }) => ({ id, pick, ok, ms })) }),
      });
      if (r.status === 503) throw new Error("offline");
      const j = await r.json();
      if (!r.ok) {
        setState("error");
        setMsg(j.error || "Could not save");
        return;
      }
    } catch {
      saveLocal(n, game, score);
    }
    setState("sent");
    window.dispatchEvent(new Event("arena:refresh"));
  };

  if (state === "sent") return <p className="text-sm text-pass">Saved to the leaderboard. 🏆</p>;
  return (
    <form onSubmit={submit} className="flex w-full max-w-sm gap-2">
      <label htmlFor={`arena-name-${game}`} className="sr-only">
        Your name
      </label>
      <input id={`arena-name-${game}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Your name" className="input py-2" />
      <button disabled={state === "sending" || !name.trim()} className="btn-primary shrink-0 px-3" aria-label="Save score">
        <Send size={14} />
      </button>
      {state === "error" && <p className="text-xs text-fail">{msg}</p>}
    </form>
  );
}

/* ---------------- one game ---------------- */
type Phase = "menu" | "play" | "reveal" | "done";

function Game({ game }: { game: GameId }) {
  const cfg = GAMES[game];
  const { unlock, toast } = useApp();
  const { streak, bump } = useContext(StreakCtx);
  const [level, setLevel] = useState<Level>("easy");
  const [phase, setPhase] = useState<Phase>("menu");
  const [ids, setIds] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Pick[]>([]);
  const [left, setLeft] = useState(cfg.limit);
  const startRef = useRef(0);
  const doneRef = useRef(false);

  const qid = ids[idx];
  const current = answers[idx];
  const score = useMemo(() => scoreRound(game, answers), [game, answers]);

  const start = (lv: Level) => {
    setLevel(lv);
    setIds(shuffle(pool(game, lv)).slice(0, cfg.round));
    setIdx(0);
    setAnswers([]);
    setPhase("play");
    setLeft(cfg.limit);
    startRef.current = Date.now();
    doneRef.current = false;
  };

  const answer = useCallback(
    (pick: number | undefined, sqlOk?: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      const ms = Math.max(600, Date.now() - startRef.current);
      let ok = false;
      if (game === "bugspot") ok = BUG_QS.find((q) => q.id === qid)?.bug === pick;
      else if (game === "output") ok = OUT_QS.find((q) => q.id === qid)?.answer === pick;
      else ok = sqlOk === true;
      setAnswers((a) => [...a, { id: qid, pick, ok, ms }]);
      bump(ok);
      setPhase("reveal");
    },
    [game, qid, bump],
  );

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => {
      const l = cfg.limit - (Date.now() - startRef.current) / 1000;
      setLeft(Math.max(0, l));
      if (l <= 0) answer(undefined, false);
    }, 200);
    return () => clearInterval(t);
  }, [phase, cfg.limit, answer]);

  const next = () => {
    if (idx + 1 < ids.length) {
      setIdx(idx + 1);
      setPhase("play");
      setLeft(cfg.limit);
      startRef.current = Date.now();
      doneRef.current = false;
      return;
    }
    setPhase("done");
    unlock("gladiator");
    const perfect = answers.length === ids.length && answers.every((a) => a.ok);
    if (perfect) unlock("flawless");
    if (perfect && game === "sql" && level === "hard") unlock("sqlWizard");
    toast({ title: `${cfg.name}: ${score.total} pts`, desc: `${score.correct}/${ids.length} correct`, tone: "info" });
  };

  if (phase === "menu") {
    return (
      <div className="flex flex-col items-start gap-5 py-2">
        <p className="max-w-xl text-sm text-muted">
          {cfg.blurb} {cfg.round} questions, {cfg.limit}s each. Faster answers earn more, and 3 in a row adds a streak bonus.
        </p>
        <div className="grid w-full gap-3 sm:grid-cols-3">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => start(lv)}
              className="group rounded-xl border border-line/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand/5"
            >
              <p className={`font-display text-lg font-semibold capitalize ${LEVEL_STYLE[lv]}`}>{lv}</p>
              <p className="mt-1 text-xs text-muted">
                {lv === "easy" ? "Warm-up classics" : lv === "medium" ? "Bugs that reach code review" : "Bugs that reach production"}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand">
                <Play size={14} /> Start
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const perfect = answers.every((a) => a.ok);
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-4xl">{perfect ? "🏆" : score.correct >= ids.length / 2 ? "💪" : "📚"}</p>
        <p className="font-display text-3xl font-bold">
          <span className="gradient-text">{score.total}</span> pts
        </p>
        <p className="text-sm text-muted">
          {score.correct}/{ids.length} correct on <span className={`capitalize ${LEVEL_STYLE[level]}`}>{level}</span> · best streak {score.best}
        </p>
        <div className="flex gap-1.5">
          {answers.map((a, i) => (
            <span key={i} className={`grid h-7 w-7 place-items-center rounded-full ${a.ok ? "bg-pass/15 text-pass" : "bg-fail/15 text-fail"}`}>
              {a.ok ? <Check size={14} /> : <X size={14} />}
            </span>
          ))}
        </div>
        {score.total > 0 && <SubmitScore game={game} answers={answers} score={score.total} />}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => start(level)} className="btn-primary">
            <RotateCcw size={15} /> Play again
          </button>
          <button type="button" onClick={() => setPhase("menu")} className="btn-ghost">
            Change level
          </button>
        </div>
      </motion.div>
    );
  }

  const bugQ = game === "bugspot" ? BUG_QS.find((q) => q.id === qid) : undefined;
  const outQ = game === "output" ? OUT_QS.find((q) => q.id === qid) : undefined;
  const sqlQ = game === "sql" ? SQL_QS.find((q) => q.id === qid) : undefined;
  const explain = bugQ?.explain ?? outQ?.explain;
  const reveal = phase === "reveal";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="font-mono text-muted">
          Q {idx + 1}/{ids.length}
        </span>
        <span className={`capitalize ${LEVEL_STYLE[level]}`}>{level}</span>
        <span className="font-mono">
          <b className="text-brand">{score.total}</b> pts
        </span>
        {streak >= 2 && (
          <span className="inline-flex items-center gap-1 text-warn">
            <Flame size={13} /> {streak} streak
          </span>
        )}
        <span className={`ml-auto inline-flex items-center gap-1 font-mono ${left < 6 ? "text-fail" : "text-muted"}`}>
          <Timer size={13} /> {Math.ceil(left)}s
        </span>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-fg/10">
        <div className={`h-full transition-[width] duration-200 ${left < 6 ? "bg-fail" : "bg-brand"}`} style={{ width: `${reveal ? 0 : (left / cfg.limit) * 100}%` }} />
      </div>

      {bugQ && <BugView q={bugQ} pick={current?.pick} reveal={reveal} onPick={(i) => answer(i)} />}
      {outQ && <OutView q={outQ} pick={current?.pick} reveal={reveal} onPick={(i) => answer(i)} />}
      {sqlQ && <SqlView q={sqlQ} reveal={reveal} ok={current?.ok} onSubmit={(ok) => answer(undefined, ok)} />}

      <AnimatePresence>
        {reveal && current && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 rounded-xl border p-4 ${current.ok ? "border-pass/30 bg-pass/10" : "border-fail/30 bg-fail/10"}`}
            role="status"
          >
            <p className={`font-semibold ${current.ok ? "text-pass" : "text-fail"}`}>
              {current.ok ? "Correct!" : current.pick === undefined && !current.ok && left <= 0 ? "Time's up." : "Not quite."}
            </p>
            {explain && (
              <p className="mt-1 text-sm leading-relaxed">
                <Rich text={explain} />
              </p>
            )}
            {sqlQ && current.ok && <p className="mt-1 text-sm">Your query returns exactly the expected rows.</p>}
            <button type="button" onClick={next} className="btn-primary mt-3 px-4 py-2 text-sm">
              {idx + 1 < ids.length ? "Next question" : "See results"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- daily challenge ---------------- */
function Daily() {
  const { unlock } = useApp();
  const d = useMemo(() => dailyQuestion(), []);
  const [state, setState] = useState<{ day: number; pick: number } | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const s = load<{ day: number; pick: number } | null>("arena-daily", null);
    if (s?.day === d.day) setState(s);
    const st = load<{ last: number; count: number }>("arena-daily-streak", { last: 0, count: 0 });
    setStreak(st.last >= d.day - 1 ? st.count : 0);
  }, [d.day]);

  const pick = (i: number) => {
    const s = { day: d.day, pick: i };
    setState(s);
    save("arena-daily", s);
    const ok = d.kind === "bugspot" ? i === (d.q as BugQ).bug : i === (d.q as OutQ).answer;
    if (ok) {
      unlock("daily");
      const st = load<{ last: number; count: number }>("arena-daily-streak", { last: 0, count: 0 });
      const count = st.last === d.day - 1 ? st.count + 1 : st.last === d.day ? st.count : 1;
      save("arena-daily-streak", { last: d.day, count });
      setStreak(count);
    }
  };

  const reveal = state !== null;
  const ok = reveal && (d.kind === "bugspot" ? state.pick === (d.q as BugQ).bug : state.pick === (d.q as OutQ).answer);

  return (
    <div className="card p-4" data-testid="daily">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display font-semibold">
          <CalendarDays size={16} className="text-brand" /> Daily challenge
        </p>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-warn">
            <Flame size={13} /> {streak} day{streak > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="text-[13px]">
        {d.kind === "bugspot" ? (
          <BugView q={d.q as BugQ} pick={state?.pick} reveal={reveal} onPick={pick} />
        ) : (
          <OutView q={d.q as OutQ} pick={state?.pick} reveal={reveal} onPick={pick} />
        )}
      </div>
      {reveal && (
        <p className={`mt-3 text-xs leading-relaxed ${ok ? "text-pass" : "text-fail"}`}>
          {ok ? "Solved! " : "Not this time. "}
          <span className="text-fg">
            <Rich text={d.q.explain} />
          </span>
          <span className="mt-1 block text-muted">A new challenge appears tomorrow.</span>
        </p>
      )}
    </div>
  );
}

/* ---------------- leaderboard ---------------- */
const BOARDS: { id: "total" | GameId; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "bugspot", label: "Bugs" },
  { id: "output", label: "Output" },
  { id: "sql", label: "SQL" },
];

function ArenaBoard() {
  const [board, setBoard] = useState<"total" | GameId>("total");
  const [entries, setEntries] = useState<{ name: string; score: number }[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/arena?board=${board}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.enabled) {
        setOnline(true);
        setEntries(j.entries);
        return;
      }
    } catch {}
    setOnline(false);
    const local = load<LocalBoard>("arena-local", {});
    setEntries(
      Object.entries(local)
        .map(([name, s]) => ({ name, score: board === "total" ? (s.bugspot ?? 0) + (s.output ?? 0) + (s.sql ?? 0) : s[board] ?? 0 }))
        .filter((e) => e.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    );
  }, [board]);

  useEffect(() => {
    refresh();
    window.addEventListener("arena:refresh", refresh);
    return () => window.removeEventListener("arena:refresh", refresh);
  }, [refresh]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display font-semibold">
          <Medal size={16} className="text-warn" /> Arena leaderboard
        </p>
        <span className="text-[10px] uppercase tracking-wider text-muted">{online === false ? "this device" : "global"}</span>
      </div>
      <div className="mt-3 flex gap-1 rounded-lg bg-fg/[0.04] p-1" role="tablist" aria-label="Leaderboard">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={board === b.id}
            onClick={() => setBoard(b.id)}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${board === b.id ? "bg-bg text-fg shadow-sm ring-1 ring-fg/10" : "text-muted hover:text-fg"}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      <ol className="mt-3 space-y-1">
        {entries.length === 0 && <li className="text-xs text-muted">No scores yet. Finish a round to claim the top spot!</li>}
        {entries.map((e, i) => (
          <li key={e.name} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-center">{["🥇", "🥈", "🥉"][i] ?? <span className="font-mono text-muted">{i + 1}</span>}</span>
            <span className="flex-1 truncate">{e.name}</span>
            <span className="font-mono font-semibold text-brand">{e.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- section ---------------- */
export function openArena(game?: GameId) {
  if (game) window.dispatchEvent(new CustomEvent<GameId>("arena:game", { detail: game }));
  document.getElementById("arena")?.scrollIntoView({ behavior: "smooth" });
}

export function Arena() {
  const { unlock } = useApp();
  const [game, setGame] = useState<GameId>("bugspot");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const h = (e: Event) => setGame((e as CustomEvent<GameId>).detail);
    window.addEventListener("arena:game", h);
    return () => window.removeEventListener("arena:game", h);
  }, []);

  const bump = useCallback(
    (ok: boolean) =>
      setStreak((s) => {
        const n = ok ? s + 1 : 0;
        if (n >= 10) unlock("onFire");
        return n;
      }),
    [unlock],
  );

  return (
    <Section
      id="arena"
      eyebrow="05 · Dev Arena"
      title={
        <>
          Think like a developer. <span className="gradient-text">Play.</span>
        </>
      }
      intro="Three quick games built from bugs I have actually met in Laravel, Vue and JavaScript work. Spot the bug, predict the output, write the SQL. Every answer explains the why."
    >
      <StreakCtx.Provider value={{ streak, bump }}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
          <Reveal>
            <div className="card overflow-hidden">
              <div className="flex gap-1 overflow-x-auto border-b border-line/10 p-2" role="tablist" aria-label="Dev Arena">
                {GAME_TABS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    id={`arena-tab-${t.id}`}
                    aria-selected={game === t.id}
                    aria-controls={`arena-panel-${t.id}`}
                    onClick={() => setGame(t.id)}
                    className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${game === t.id ? "text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {game === t.id && <motion.span layoutId="arena-tab" className="absolute inset-0 -z-10 rounded-xl bg-fg/[0.06] ring-1 ring-fg/10" />}
                    <t.icon size={16} className={game === t.id ? "text-brand" : ""} />
                    {GAMES[t.id].name}
                  </button>
                ))}
                <span className="ml-auto hidden items-center gap-1 self-center pr-2 text-xs text-muted sm:flex">
                  <Sparkles size={13} className="text-brand" /> learn while you play
                </span>
              </div>
              <div className="p-4 sm:p-6">
                {GAME_TABS.map((t) => (
                  <div key={t.id} role="tabpanel" id={`arena-panel-${t.id}`} aria-labelledby={`arena-tab-${t.id}`} hidden={game !== t.id}>
                    <Game game={t.id} />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <div className="flex flex-col gap-6">
            <Reveal delay={0.05}>
              <Daily />
            </Reveal>
            <Reveal delay={0.1}>
              <ArenaBoard />
            </Reveal>
          </div>
        </div>
      </StreakCtx.Provider>
    </Section>
  );
}
