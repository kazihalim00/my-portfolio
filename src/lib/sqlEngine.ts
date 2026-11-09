// Browser-only SQL sandbox for SQL Rush, powered by alasql (public/vendor, loaded on demand).
import { SQL_SCHEMA } from "./arena";

type Row = Record<string, unknown>;
type DB = { exec: (sql: string) => unknown };

let dbPromise: Promise<DB> | null = null;

function getDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = new Promise<void>((resolve, reject) => {
      if ((window as unknown as { alasql?: unknown }).alasql) return resolve();
      const s = document.createElement("script");
      s.src = "/vendor/alasql.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        dbPromise = null;
        reject(new Error("Could not load the SQL engine. Check your connection and try again."));
      };
      document.head.appendChild(s);
    }).then(() => {
      const alasql = (window as unknown as { alasql: { Database: new () => DB & { tables: Record<string, { data: Row[] }> } } }).alasql;
      const db = new alasql.Database();
      for (const [name, t] of Object.entries(SQL_SCHEMA)) {
        db.exec(`CREATE TABLE ${name}`);
        db.tables[name].data = t.rows.map((r) => Object.fromEntries(t.cols.map((c, i) => [c, r[i]])));
      }
      return db;
    });
  }
  return dbPromise;
}

const FORBIDDEN = /\b(insert|update|delete|drop|create|alter|attach|detach|use|into|source|require|truncate|declare|set)\b|\b(csv|json|txt|tsv|tab|xlsx?|file|html)\s*\(/i;

export async function runSql(raw: string): Promise<{ rows: Row[] } | { error: string }> {
  const sql = raw.trim().replace(/;\s*$/, "");
  if (!sql) return { error: "Write a query first." };
  if (!/^(select|with)\b/i.test(sql)) return { error: "Only SELECT queries are allowed here." };
  if (sql.includes(";")) return { error: "One statement at a time, please." };
  if (FORBIDDEN.test(sql)) return { error: "That keyword is not allowed in this sandbox." };
  try {
    const db = await getDb();
    const res = db.exec(sql);
    if (!Array.isArray(res)) return { error: "The query did not return rows." };
    return { rows: (res as Row[]).slice(0, 200) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg.split("\n").slice(0, 3).join(" ").slice(0, 220) };
  }
}

const norm = (v: unknown) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v ?? "null").trim().toLowerCase());
const rowKey = (r: Row) => Object.values(r).map(norm).sort().join("|");

/** Compare by values (column names and order do not matter). Row order only matters when the task says so. */
export function sameResult(actual: Row[], expected: Row[], ordered = false) {
  if (actual.length !== expected.length) return false;
  if (actual.length && Object.keys(actual[0]).length !== Object.keys(expected[0]).length) return false;
  const a = actual.map(rowKey);
  const b = expected.map(rowKey);
  if (!ordered) {
    a.sort();
    b.sort();
  }
  return a.every((k, i) => k === b[i]);
}
