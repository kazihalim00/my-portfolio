import { NextResponse } from "next/server";
import { allow, clean, clientIp, isBlocked, kv, kvEnabled } from "@/lib/kv";

export const dynamic = "force-dynamic";
const KEY = "bughunt:leaderboard";
const TOTAL_BUGS = 8;

type Entry = { name: string; found: number; seconds: number; at: number };

export async function GET() {
  if (!kvEnabled) return NextResponse.json({ enabled: false, entries: [] });
  try {
    const raw = await kv<string[]>(["ZREVRANGE", KEY, 0, 9, "WITHSCORES"]);
    const entries = [];
    for (let i = 0; i < raw.length; i += 2) {
      try {
        const e = JSON.parse(raw[i]) as Entry;
        entries.push({ ...e, score: Number(raw[i + 1]) });
      } catch {}
    }
    return NextResponse.json({ enabled: true, entries });
  } catch {
    return NextResponse.json({ enabled: false, entries: [] });
  }
}

export async function POST(req: Request) {
  if (!kvEnabled) return NextResponse.json({ error: "Leaderboard is offline" }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const name = clean(body.name, 24);
  const found = Math.round(Number(body.found));
  const hints = Math.round(Number(body.hints));
  const falseReports = Math.round(Number(body.falseReports));
  const seconds = Math.round(Number(body.seconds));
  if (!name || isBlocked(name)) return NextResponse.json({ error: "Please use a different name" }, { status: 400 });
  if (![found, hints, falseReports, seconds].every(Number.isFinite) || found < 1 || found > TOTAL_BUGS || hints < 0 || hints > TOTAL_BUGS || falseReports < 0 || seconds < 5 || seconds > 86400) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }
  // Score is recomputed on the server so the client cannot send an arbitrary number.
  const bonus = found === TOTAL_BUGS ? Math.max(0, 300 - seconds) : 0;
  const score = Math.max(0, found * 100 - hints * 25 - falseReports * 10 + bonus);
  try {
    if (!(await allow(clientIp(req), "lb", 5, 3600))) return NextResponse.json({ error: "Too many submissions, try later" }, { status: 429 });
    const entry: Entry = { name, found, seconds, at: Date.now() };
    await kv(["ZADD", KEY, score, JSON.stringify(entry)]);
    await kv(["ZREMRANGEBYRANK", KEY, 0, -101]);
    return NextResponse.json({ ok: true, score });
  } catch {
    return NextResponse.json({ error: "Could not save score" }, { status: 500 });
  }
}
