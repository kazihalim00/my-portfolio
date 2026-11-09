"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BUGS, BUG_POINTS, FALSE_REPORT_COST, HINT_COST, type BugId } from "@/lib/bugs";
import { useApp } from "../Providers";

type LabCtx = {
  found: BugId[];
  hints: BugId[];
  falseReports: number;
  seconds: number;
  started: boolean;
  finished: boolean;
  score: number;
  start: () => void;
  find: (id: BugId) => void;
  takeHint: (id: BugId) => void;
  falseReport: () => void;
  finish: () => void;
  reset: () => void;
};

const Ctx = createContext<LabCtx | null>(null);
export const useLab = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLab outside LabProvider");
  return c;
};

export function computeScore(found: number, hints: number, falseReports: number, seconds: number, allFound: boolean) {
  const bonus = allFound ? Math.max(0, 300 - seconds) : 0;
  return Math.max(0, found * BUG_POINTS - hints * HINT_COST - falseReports * FALSE_REPORT_COST + bonus);
}

export function LabProvider({ children }: { children: React.ReactNode }) {
  const { toast, unlock } = useApp();
  const [found, setFound] = useState<BugId[]>([]);
  const [hints, setHints] = useState<BugId[]>([]);
  const [falseReports, setFalse] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const foundRef = useRef<BugId[]>([]);

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, endedAt]);

  const start = useCallback(() => {
    setStartedAt((s) => s ?? Date.now());
    setNow(Date.now());
  }, []);

  const finish = useCallback(() => setEndedAt((e) => e ?? Date.now()), []);

  const find = useCallback(
    (id: BugId) => {
      if (foundRef.current.includes(id)) return;
      const next = [...foundRef.current, id];
      foundRef.current = next;
      setFound(next);
      setStartedAt((s) => s ?? Date.now());
      const bug = BUGS.find((b) => b.id === id)!;
      toast({ title: `Bug found: ${bug.title}`, desc: `${bug.severity} severity · +${BUG_POINTS} pts. A bug report was filed.`, tone: "bug" });
      unlock("firstBug");
      if (next.length === BUGS.length) {
        unlock("bugHunter");
        setEndedAt((e) => e ?? Date.now());
      }
    },
    [toast, unlock]
  );

  const takeHint = useCallback((id: BugId) => setHints((h) => (h.includes(id) ? h : [...h, id])), []);
  const falseReport = useCallback(() => {
    setFalse((n) => n + 1);
    toast({ title: "Not a bug", desc: `That works as expected. −${FALSE_REPORT_COST} pts`, tone: "info" });
  }, [toast]);

  const reset = useCallback(() => {
    foundRef.current = [];
    setFound([]);
    setHints([]);
    setFalse(0);
    setStartedAt(null);
    setEndedAt(null);
  }, []);

  const seconds = startedAt ? Math.max(0, Math.floor(((endedAt ?? (now || startedAt)) - startedAt) / 1000)) : 0;
  const score = computeScore(found.length, hints.length, falseReports, seconds, found.length === BUGS.length);

  const value = useMemo(
    () => ({
      found,
      hints,
      falseReports,
      seconds,
      started: !!startedAt,
      finished: !!endedAt,
      score,
      start,
      find,
      takeHint,
      falseReport,
      finish,
      reset,
    }),
    [found, hints, falseReports, seconds, startedAt, endedAt, score, start, find, takeHint, falseReport, finish, reset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
