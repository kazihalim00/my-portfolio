import { NextResponse } from "next/server";
import { allow, clean, clientIp, isBlocked, kv, kvEnabled } from "@/lib/kv";
import { BY_ID, GAMES, scoreRound, type Answer, type GameId } from "@/lib/arena";

export const dynamic = "force-dynamic";
const BOARDS = ["total", "bugspot", "output", "sql"] as const;
type Board = (typeof BOARDS)[number];
const key = (b: Board) => `arena:${b}`;

export async function GET(req: Request) {
  const board = (new URL(req.url).searchParams.get("board") || "total") as Board;
  if (!BOARDS.includes(board)) return NextResponse.json({ error: "Unknown board" }, { status: 400 });
  if (!kvEnabled) return NextResponse.json({ enabled: false, entries: [] });
  try {
    const raw = await kv<string[]>(["ZREVRANGE", key(board), 0, 9, "WITHSCORES"]);
    const entries = [];
    for (let i = 0; i < raw.length; i += 2) entries.push({ name: raw[i], score: Number(raw[i + 1]) });
    return NextResponse.json({ enabled: true, entries });
  } catch {
    return NextResponse.json({ enabled: false, entries: [] });
  }
}

export async function POST(req: Request) {
  if (!kvEnabled) return NextResponse.json({ error: "Leaderboard is offline" }, { status: 503 });
  let body: { name?: unknown; game?: unknown; answers?: unknown; picks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const name = clean(body.name, 24);
  const game = body.game as GameId;
  if (!name || isBlocked(name)) return NextResponse.json({ error: "Please use a different name" }, { status: 400 });
  if (!(game in GAMES)) return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  const raw = Array.isArray(body.answers) ? body.answers : [];
  if (raw.length < 1 || raw.length > GAMES[game].round) return NextResponse.json({ error: "Invalid round" }, { status: 400 });

  // Rebuild the answers on the server: for multiple-choice games the server checks the pick itself.
  const seen = new Set<string>();
  const answers: Answer[] = [];
  for (const r of raw as { id?: unknown; pick?: unknown; ok?: unknown; ms?: unknown }[]) {
    const id = String(r?.id ?? "");
    const meta = BY_ID[id];
    if (!meta || meta.game !== game || seen.has(id)) return NextResponse.json({ error: "Invalid round" }, { status: 400 });
    seen.add(id);
    const ms = Math.round(Number(r.ms));
    if (!Number.isFinite(ms) || ms < 600) return NextResponse.json({ error: "Invalid round" }, { status: 400 });
    const ok = game === "sql" ? r.ok === true : Number(r.pick) === meta.answer;
    answers.push({ id, ok, ms });
  }
  const { total } = scoreRound(game, answers);

  try {
    if (!(await allow(clientIp(req), "arena", 12, 3600))) return NextResponse.json({ error: "Too many submissions, try later" }, { status: 429 });
    // Keep each player's best score per game, and the sum of those bests on the total board.
    await kv(["ZADD", key(game), "GT", total, name]);
    const bests = await Promise.all((["bugspot", "output", "sql"] as const).map((g) => kv<string | null>(["ZSCORE", key(g), name])));
    const sum = bests.reduce((s, v) => s + (v ? Number(v) : 0), 0);
    await kv(["ZADD", key("total"), sum, name]);
    for (const b of BOARDS) await kv(["ZREMRANGEBYRANK", key(b), 0, -201]);
    return NextResponse.json({ ok: true, score: total, totalScore: sum });
  } catch {
    return NextResponse.json({ error: "Could not save score" }, { status: 500 });
  }
}
