"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Medal, Send } from "lucide-react";
import { BUGS } from "@/lib/bugs";
import { useLab } from "./LabState";
import { load, save } from "../Providers";

type Entry = { name: string; score: number; found: number; seconds: number; at: number };

export function Leaderboard() {
  const lab = useLab();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/leaderboard", { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.enabled) {
        setOnline(true);
        setEntries(j.entries);
        return;
      }
    } catch {}
    setOnline(false);
    setEntries(load<Entry[]>("local-leaderboard", []));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!lab.finished) setStatus("idle");
  }, [lab.finished]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().slice(0, 24);
    if (!n) return;
    setStatus("sending");
    const payload = { name: n, found: lab.found.length, hints: lab.hints.length, falseReports: lab.falseReports, seconds: Math.max(5, lab.seconds) };
    if (online) {
      try {
        const r = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setStatus("sent");
        refresh();
        return;
      } catch (err) {
        setStatus("error");
        setMsg(err instanceof Error ? err.message : "Failed");
        return;
      }
    }
    const local = [...load<Entry[]>("local-leaderboard", []), { name: n, score: lab.score, found: lab.found.length, seconds: lab.seconds, at: Date.now() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    save("local-leaderboard", local);
    setEntries(local);
    setStatus("sent");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-line/10 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display font-semibold">
          <Medal size={16} className="text-warn" /> Hall of fame
        </p>
        <span className="text-[10px] uppercase tracking-wider text-muted">{online === false ? "this device" : "global"}</span>
      </div>

      {lab.finished && status !== "sent" && (
        <form onSubmit={submit} className="mt-3 rounded-lg bg-brand/10 p-3">
          <p className="text-xs">
            You found <b>{lab.found.length}/{BUGS.length}</b> bugs for <b className="text-brand">{lab.score} pts</b>. Save your score:
          </p>
          <div className="mt-2 flex gap-2">
            <label htmlFor="lb-name" className="sr-only">
              Your name
            </label>
            <input id="lb-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Your name" className="input py-1.5" />
            <button disabled={status === "sending" || !name.trim()} className="btn-primary shrink-0 px-3 py-1.5" aria-label="Submit score">
              <Send size={14} />
            </button>
          </div>
          {status === "error" && <p className="mt-1 text-xs text-fail">{msg}</p>}
        </form>
      )}
      {status === "sent" && <p className="mt-3 text-xs text-pass">Score saved. Nice hunting! 🐞</p>}

      <ol className="mt-3 space-y-1">
        {entries.length === 0 && <li className="text-xs text-muted">No scores yet. Be the first!</li>}
        {entries.slice(0, 10).map((e, i) => (
          <li key={`${e.name}-${e.at}`} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-center">{["🥇", "🥈", "🥉"][i] ?? <span className="font-mono text-muted">{i + 1}</span>}</span>
            <span className="flex-1 truncate">{e.name}</span>
            <span className="font-mono text-muted">{e.found}/8</span>
            <span className="w-12 text-right font-mono font-semibold text-brand">{e.score}</span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
