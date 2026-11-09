"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Wrench } from "lucide-react";
import { BUGS, type BugId } from "@/lib/bugs";
import { useLab } from "./LabState";
import { useApp } from "../Providers";

type Test = { name: string; bug: BugId | null };
const TESTS: Test[] = [
  { name: "cart › shows all items with prices", bug: null },
  ...BUGS.map((b) => ({ name: b.test, bug: b.id })),
  { name: "checkout › happy path places an order", bug: null },
  { name: "perf › page is interactive under 2s", bug: null },
];
const BROWSERS = ["chromium", "firefox", "webkit"] as const;

type Line =
  | { kind: "text"; text: string; tone?: "muted" | "brand" | "pass" | "fail" }
  | { kind: "result"; ok: boolean; browser: string; name: string; ms: number; idx: number };

const SPEC = [
  ["c", "// tests/shoplite.spec.ts"],
  ["k", "import { test, expect } from '@playwright/test';"],
  ["", ""],
  ["k", "test.describe('coupon', () => {"],
  ["", "  test('SAVE10 can only be applied once', async ({ page }) => {"],
  ["", "    await page.goto('/shop');"],
  ["", "    await page.getByPlaceholder('Coupon code').fill('SAVE10');"],
  ["", "    const apply = page.getByRole('button', { name: 'Apply' });"],
  ["", "    await apply.click();"],
  ["", "    await apply.click();"],
  ["s", "    await expect(page.getByTestId('discount'))"],
  ["s", "      .toHaveText('-$9.35');"],
  ["", "  });"],
  ["k", "});"],
  ["", ""],
  ["k", "test('rejects invalid email', async ({ page }) => {"],
  ["", "  await page.getByPlaceholder('Email *').fill('abc');"],
  ["", "  await page.getByRole('button', { name: 'Place order' }).click();"],
  ["s", "  await expect(page.getByText('Enter a valid email'))"],
  ["s", "    .toBeVisible();"],
  ["k", "});"],
] as const;

export function TestRunner() {
  const lab = useLab();
  const { unlock } = useApp();
  const [fixAll, setFixAll] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [lines]);

  const isFixed = (t: Test) => t.bug === null || fixAll || lab.found.includes(t.bug);

  const run = () => {
    if (timer.current) clearInterval(timer.current);
    unlock("tester");
    const jobs: Line[] = [];
    let idx = 0;
    // interleave as 3 workers would
    TESTS.forEach((t) =>
      BROWSERS.forEach((b) => {
        jobs.push({ kind: "result", ok: isFixed(t), browser: b, name: t.name, ms: Math.round(120 + Math.random() * 900), idx: ++idx });
      })
    );
    jobs.sort(() => Math.random() - 0.5);
    const total = jobs.length;
    setLines([
      { kind: "text", text: "$ npx playwright test --reporter=list", tone: "brand" },
      { kind: "text", text: `Running ${total} tests using 3 workers`, tone: "muted" },
      { kind: "text", text: "" },
    ]);
    setRunning(true);
    setDone(false);
    setProgress(0);
    let i = 0;
    timer.current = setInterval(() => {
      if (i >= jobs.length) {
        clearInterval(timer.current!);
        const failed = jobs.filter((j) => j.kind === "result" && !j.ok).length;
        const passed = total - failed;
        const secs = (jobs.reduce((s, j) => s + (j.kind === "result" ? j.ms : 0), 0) / 3000).toFixed(1);
        setLines((l) => [
          ...l,
          { kind: "text", text: "" },
          ...(failed ? [{ kind: "text" as const, text: `  ${failed} failed`, tone: "fail" as const }] : []),
          { kind: "text", text: `  ${passed} passed (${secs}s)`, tone: "pass" },
        ]);
        setRunning(false);
        setDone(true);
        if (!failed) unlock("fixer");
        return;
      }
      const job = jobs[i++];
      setLines((l) => [...l, job]);
      setProgress(i / jobs.length);
    }, 75);
  };

  const failing = TESTS.filter((t) => !isFixed(t));
  const tone = { muted: "text-muted", brand: "text-brand2", pass: "text-pass", fail: "text-fail" } as const;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm text-muted">
          A Playwright-style suite for ShopLite: {TESTS.length} tests × 3 browsers. Bugs you report in Bug Hunt get
          <span className="font-semibold text-fg"> fixed by the dev team</span>, so their tests turn green.
        </p>
        <div className="scrollbar-thin overflow-x-auto rounded-xl border border-line/10 bg-bg/70 p-4 font-mono text-[11.5px] leading-relaxed">
          {SPEC.map(([k, t], i) => (
            <div key={i} className="flex whitespace-pre">
              <span className="mr-4 w-5 select-none text-right text-muted/50">{i + 1}</span>
              <span className={k === "c" ? "text-muted" : k === "k" ? "text-brand2" : k === "s" ? "text-brand" : ""}>{t || " "}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={run} disabled={running} className="btn-primary">
            {done ? <RotateCcw size={15} /> : <Play size={15} />} {done ? "Run again" : "Run tests"}
          </button>
          <label className="btn-ghost cursor-pointer select-none">
            <input type="checkbox" checked={fixAll} onChange={(e) => setFixAll(e.target.checked)} className="accent-[rgb(var(--brand))]" />
            <Wrench size={15} /> Ship all fixes
          </label>
        </div>
        <p className="text-xs text-muted">
          Currently failing: <span className={failing.length ? "text-fail" : "text-pass"}>{failing.length} tests</span> ·{" "}
          {lab.found.length}/{BUGS.length} bugs reported
        </p>
      </div>

      <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line/10 bg-[#070a14] text-slate-200">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
          <span className="ml-2 font-mono text-[11px] text-slate-400">terminal · playwright</span>
        </div>
        <div className="h-1 bg-white/5">
          <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-indigo-400" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.1 }} />
        </div>
        <div ref={outRef} className="scrollbar-thin h-[340px] overflow-y-auto p-4 font-mono text-[11.5px] leading-relaxed" aria-live="polite">
          {lines.length === 0 && <p className="text-slate-500">Press “Run tests” to start the suite.</p>}
          {lines.map((l, i) =>
            l.kind === "text" ? (
              <p key={i} className={`${l.tone ? tone[l.tone] : ""} whitespace-pre-wrap`}>
                {l.text || " "}
              </p>
            ) : (
              <p key={i} className="flex gap-2">
                <span className={l.ok ? "text-green-400" : "text-red-400"}>{l.ok ? "✓" : "✘"}</span>
                <span className="w-7 shrink-0 text-right text-slate-500">{l.idx}</span>
                <span className="shrink-0 text-slate-500">[{l.browser}]</span>
                <span className={`min-w-0 flex-1 truncate ${l.ok ? "" : "text-red-300"}`}>{l.name}</span>
                <span className="text-slate-500">{l.ms}ms</span>
              </p>
            )
          )}
          {done && failing.length > 0 && (
            <div className="mt-4 space-y-3">
              {failing.slice(0, 3).map((t, i) => {
                const b = BUGS.find((x) => x.id === t.bug)!;
                return (
                  <div key={t.name} className="rounded-lg border border-red-400/20 bg-red-400/5 p-3">
                    <p className="text-red-300">
                      {i + 1}) [chromium] › {t.name}
                    </p>
                    <p className="mt-1 text-slate-400">Error: expect(received).toEqual(expected)</p>
                    <p className="text-green-400">- Expected: {b.expected}</p>
                    <p className="text-red-400">+ Received: {b.actual}</p>
                  </div>
                );
              })}
              {failing.length > 3 && <p className="text-slate-500">…and {failing.length - 3} more. Report bugs in Bug Hunt to get them fixed.</p>}
            </div>
          )}
          {done && failing.length === 0 && <p className="mt-3 rounded-lg bg-green-400/10 px-3 py-2 text-green-400">All green. Ship it! 🚀</p>}
        </div>
      </div>
    </div>
  );
}
