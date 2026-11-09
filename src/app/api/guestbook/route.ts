import { NextResponse } from "next/server";
import { allow, clean, clientIp, isBlocked, kv, kvEnabled } from "@/lib/kv";

export const dynamic = "force-dynamic";
const KEY = "guestbook";

type Note = { name: string; message: string; role: string; emoji: string; at: number };
const ROLES = ["Recruiter", "Developer", "QA / Tester", "Student", "Friend", "Visitor"];
const EMOJIS = ["👋", "🔥", "🚀", "🐞", "💚", "⭐"];

export async function GET() {
  if (!kvEnabled) return NextResponse.json({ enabled: false, notes: [] });
  try {
    const raw = await kv<string[]>(["LRANGE", KEY, 0, 49]);
    const notes = raw.flatMap((r) => {
      try {
        return [JSON.parse(r) as Note];
      } catch {
        return [];
      }
    });
    return NextResponse.json({ enabled: true, notes });
  } catch {
    return NextResponse.json({ enabled: false, notes: [] });
  }
}

export async function POST(req: Request) {
  if (!kvEnabled) return NextResponse.json({ error: "Guestbook is offline" }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true }); // honeypot
  const name = clean(body.name, 32);
  const message = clean(body.message, 280);
  const role = ROLES.includes(String(body.role)) ? String(body.role) : "Visitor";
  const emoji = EMOJIS.includes(String(body.emoji)) ? String(body.emoji) : "👋";
  if (name.length < 2 || message.length < 2) return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
  if (isBlocked(name) || isBlocked(message)) return NextResponse.json({ error: "Links and rude words are not allowed" }, { status: 400 });
  try {
    if (!(await allow(clientIp(req), "gb", 3, 3600))) return NextResponse.json({ error: "Too many messages, try later" }, { status: 429 });
    const note: Note = { name, message, role, emoji, at: Date.now() };
    await kv(["LPUSH", KEY, JSON.stringify(note)]);
    await kv(["LTRIM", KEY, 0, 199]);
    return NextResponse.json({ ok: true, note });
  } catch {
    return NextResponse.json({ error: "Could not save message" }, { status: 500 });
  }
}
