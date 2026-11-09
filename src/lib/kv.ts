// Tiny Upstash Redis REST client. Works with Vercel's Upstash/KV integration env vars.
// If the env vars are missing, kvEnabled is false and the APIs answer 503 so the UI falls back to local data.

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = Boolean(url && token);

export async function kv<T = unknown>(command: (string | number)[]): Promise<T> {
  if (!url || !token) throw new Error("KV not configured");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || json.error) throw new Error(json.error || `KV error ${res.status}`);
  return json.result as T;
}

/** Returns true if this IP is still under `limit` writes per `windowSec`. */
export async function allow(ip: string, action: string, limit: number, windowSec: number) {
  const key = `rl:${action}:${ip}`;
  const count = await kv<number>(["INCR", key]);
  if (count === 1) await kv(["EXPIRE", key, windowSec]);
  return count <= limit;
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

const BLOCKED = ["fuck", "shit", "bitch", "nigg", "cunt", "porn", "http://", "https://", "www."];

export function clean(input: unknown, max: number) {
  if (typeof input !== "string") return "";
  const s = input.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s;
}

export function isBlocked(text: string) {
  const t = text.toLowerCase();
  return BLOCKED.some((w) => t.includes(w));
}
