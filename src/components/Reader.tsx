"use client";

import Link from "next/link";
import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Download, List, Maximize, Minus, Plus, ScrollText, Share2, Type, Volume2, VolumeX, X } from "lucide-react";
import { penName, type Book } from "@/lib/books";
import { load, save, useApp } from "./Providers";

/* ------------------------------------------------------------------ */
/* Book text: blocks extracted from the PDF (scripts/book-text).        */
/* run = [text, flags]  flags: 1 = bold, 2 = emphasis, 4 = footnote    */
/* (a footnote run holds the note text; its marker sits at that spot)  */
/* ------------------------------------------------------------------ */
type Run = [string, number];
type BlockType = "h1" | "h2" | "h3" | "p" | "li" | "quote" | "note" | "right" | "front" | "front-h1" | "front-h2" | "row";
type Block = { type: BlockType; label?: string; runs: Run[] };
type Mode = "page" | "scroll";

type Theme = "light" | "sepia" | "dark";
const THEMES: Record<Theme, { label: string; bg: string; paper: string; back: string; ink: string; muted: string; accent: string; chrome: string }> = {
  light: { label: "Light", bg: "#e7e4dd", paper: "#fffdf8", back: "#f4f0e6", ink: "#22201c", muted: "#6b6458", accent: "#0f766e", chrome: "light" },
  sepia: { label: "Sepia", bg: "#ddcfb3", paper: "#f6ecd6", back: "#ebdfc4", ink: "#3a2e20", muted: "#7a6a52", accent: "#8a4b1a", chrome: "light" },
  dark: { label: "Night", bg: "#0c0e12", paper: "#1a1d23", back: "#15181d", ink: "#dcd6c8", muted: "#9a9384", accent: "#7cc4b5", chrome: "dark" },
};

const bnDigits = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
const plain = (b: Block) => b.runs.filter((r) => !(r[1] & 4)).map((r) => r[0]).join("");
const FLIP_MS = 700;

type SavedPos = { b: number; pct: number };

/** A soft paper page-turn, synthesized with Web Audio so there is no sound file to load. */
function playPageTurn(ctxRef: { current: AudioContext | null }) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ac = (ctxRef.current ??= new Ctx());
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime + 0.01;
    const noise = (dur: number, shape: (x: number) => number) => {
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        // slightly "crinkly" noise: random grains with a gentle low-pass
        const grain = Math.random() < 0.06 ? (Math.random() * 2 - 1) * 1.6 : Math.random() * 2 - 1;
        last = last * 0.35 + grain * 0.65;
        d[i] = last * shape(i / len);
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      return src;
    };
    // the sweep of the sheet through the air
    const sweep = noise(0.42, (x) => Math.pow(Math.sin(Math.PI * Math.min(1, x * 1.15)), 1.6));
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(1400, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + 0.16);
    bp.frequency.exponentialRampToValueAtTime(1600, t + 0.42);
    const g1 = ac.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(0.32, t + 0.06);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    sweep.connect(bp).connect(g1).connect(ac.destination);
    sweep.start(t);
    // the page settling on the others
    const settle = noise(0.08, (x) => 1 - x);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, t + 0.36);
    g2.gain.exponentialRampToValueAtTime(0.22, t + 0.38);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
    settle.connect(lp).connect(g2).connect(ac.destination);
    settle.start(t + 0.36);
  } catch {
    /* audio is optional */
  }
}
type Flip = { dir: "next" | "prev"; from: number; to: number; id: number };

/** Footnote numbers, keyed "block:run". Numbering starts again with each chapter. */
const FnNums = createContext<Map<string, string>>(new Map());
function footnotes(body: Block[]) {
  const nums = new Map<string, string>();
  const text = new Map<string, string>();
  let n = 0;
  body.forEach((b, i) => {
    if (b.type === "h1" || b.type === "h2") n = 0;
    b.runs.forEach((r, j) => {
      if (!(r[1] & 4)) return;
      nums.set(`${i}:${j}`, bnDigits(++n));
      text.set(`${i}:${j}`, r[0]);
    });
  });
  return { nums, text };
}

function Runs({ runs, bi }: { runs: Run[]; bi?: number }) {
  const nums = useContext(FnNums);
  return (
    <>
      {runs.map(([t, f], i) =>
        f & 4 ? (
          <sup key={i} className="bk-fn" data-fn={`${bi}:${i}`}>
            {nums.get(`${bi}:${i}`)}
          </sup>
        ) : f & 1 ? (
          <strong key={i} className={f & 2 ? "bk-em" : undefined}>
            {t}
          </strong>
        ) : f & 2 ? (
          <span key={i} className="bk-em">
            {t}
          </span>
        ) : (
          <span key={i}>{t}</span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Book structure: front matter, dedication, contents, parts, chapters  */
/* ------------------------------------------------------------------ */
const YA = "য়"; // precomposed য়, the form the book text uses
const nk = (s: string) => s.replace(/য়/g, YA);
const CHAPTER_RE = new RegExp(`^অধ্যা${YA}\\s*([০-৯0-9]+)`);
const isHead = (b?: Block) => !!b && (b.type === "h1" || b.type === "h2");

type Heading = { label?: string; runs: Run[]; sub?: string };
/** "অধ্যায় ১: নাম (English)" -> label "অধ্যায় ১", title runs "নাম", sub "English" */
function sliceRuns(runs: Run[], start: number, end: number): Run[] {
  const out: Run[] = [];
  let pos = 0;
  for (const [t, f] of runs) {
    const a = Math.max(start, pos);
    const z = Math.min(end, pos + t.length);
    if (z > a) out.push([t.slice(a - pos, z - pos), f]);
    pos += t.length;
  }
  return out;
}
function headParts(b: Block): Heading {
  const text = b.runs.map((r) => r[0]).join("");
  let start = 0;
  let end = text.length;
  let label = b.label;
  if (!label) {
    const m = text.match(/^\s*([^:：]{2,16}?)\s*[:：]\s*(?=\S)/);
    if (m) {
      label = m[1];
      start = m[0].length;
    }
  }
  let sub: string | undefined;
  const sm = text.slice(start).match(/\s*\(([A-Za-z][^()]*)\)\s*$/);
  if (sm && sm.index! > 0) {
    sub = sm[1];
    end = start + sm.index!;
  }
  return { label, runs: sliceRuns(b.runs, start, end), sub };
}
const headTitle = (h: Heading) => h.runs.map((r) => r[0]).join("").trim();

type TocEntry = { i: number; kind: "part" | "chapter" | "plain"; label?: string; num?: string; title: string; desc?: string };
type Struct = { frontEnd: number; ded: [number, number] | null; tocSrc: [number, number] | null; mainStart: number; entries: TocEntry[]; parts: Set<number> };

function analyse(body: Block[]): Struct {
  let k = 0;
  while (k < body.length && body[k].type === "front") k++;
  const frontEnd = k;
  let ded: [number, number] | null = null;
  let tocSrc: [number, number] | null = null;
  for (;;) {
    const b = body[k];
    if (!isHead(b)) break;
    const t = plain(b).trim();
    let e = k + 1;
    while (e < body.length && !isHead(body[e])) e++;
    if (t === "উৎসর্গ") ded = [k, e];
    else if (t.startsWith("সূচিপত্র")) tocSrc = [k, e];
    else break;
    k = e;
  }
  const mainStart = k;
  // the author's chapter notes in the old contents list become descriptions
  const desc: Record<string, string[]> = {};
  if (tocSrc) {
    let cur = "";
    for (let i = tocSrc[0] + 1; i < tocSrc[1]; i++) {
      const t = nk(plain(body[i])).trim();
      const m = t.match(CHAPTER_RE);
      if (m) cur = m[1];
      else if (body[i].type === "li" && cur) (desc[cur] ??= []).push(t);
      else if (body[i].type !== "li") cur = "";
    }
  }
  const entries: TocEntry[] = [];
  const parts = new Set<number>();
  for (let i = mainStart; i < body.length; i++) {
    const b = body[i];
    if (!isHead(b)) continue;
    const h = headParts(b);
    const title = headTitle(h);
    const lab = h.label ? nk(h.label) : undefined;
    if (b.type === "h1" && lab && /খণ্ড/.test(lab)) {
      parts.add(i);
      entries.push({ i, kind: "part", label: lab, title });
      continue;
    }
    const cm = lab?.match(CHAPTER_RE);
    if (cm) entries.push({ i, kind: "chapter", label: lab, num: cm[1], title, desc: desc[cm[1]]?.join(" ") });
    else entries.push({ i, kind: "plain", label: lab, title: lab && !/খণ্ড/.test(lab) ? `${lab}: ${title}` : title });
  }
  return { frontEnd, ded, tocSrc, mainStart, entries, parts };
}

const IMPRINT_LABELS = ["জনরা", "লেখক", "গ্রন্থস্বত্ব", "প্রকাশকাল", "প্রচ্ছদ", "অক্ষরবিন্যাস ও সম্পাদনা", "যোগাযোগ", "মূল্য"];
function Imprint({ book, blocks, pageH }: { book: Book; blocks: Block[]; pageH?: number }) {
  const rows: { label: string; lines: string[] }[] = [];
  const pre: string[] = [];
  for (const b of blocks) {
    const t = plain(b).trim();
    if (IMPRINT_LABELS.includes(t)) rows.push({ label: t, lines: [] });
    else if (rows.length) rows[rows.length - 1].lines.push(t);
    else pre.push(t);
  }
  const get = (l: string) => rows.find((r) => r.label === l)?.lines ?? [];
  const rights = get("গ্রন্থস্বত্ব");
  const notice = rights.slice(1).join(" ").replace(/^\(|\)$/g, "");
  const line = (label: string, value: string) =>
    value && (
      <p key={label + value} className="bk-imp-row">
        <span className="bk-imp-l">{label}</span>
        <span className="bk-imp-v">{value}</span>
      </p>
    );
  return (
    <section data-b={0} className="bk-imprint" style={pageH ? { minHeight: pageH } : undefined}>
      <div className="bk-imp-body">
        <p className="bk-imp-title">{pre[0] ?? book.title}</p>
        <p className="bk-imp-sub">{pre[1] ?? book.tagline}</p>
        <span className="bk-imp-rule" aria-hidden />
        {line("লেখক", get("লেখক").join(" ") || penName)}
        {line("জনরা", get("জনরা").join(" "))}
        {line("গ্রন্থস্বত্ব", rights[0] ? `© ${rights[0]}` : "")}
        {get("প্রকাশকাল").map((l) => {
          const [a, ...v] = l.split(/[:：]\s*/);
          return v.length ? line(a, v.join(": ")) : line("প্রকাশকাল", l);
        })}
        {line("প্রচ্ছদ", get("প্রচ্ছদ").join(" "))}
        {line("অক্ষরবিন্যাস ও সম্পাদনা", get("অক্ষরবিন্যাস ও সম্পাদনা").join(" "))}
        {line("যোগাযোগ", get("যোগাযোগ").join(" ").replace(/^ইমেইল[:：]\s*/, ""))}
        {line("মূল্য", get("মূল্য").join(" "))}
        {notice && <p className="bk-imp-notice">{notice}</p>}
      </div>
    </section>
  );
}

function Opener({ b, i }: { b: Block; i: number }) {
  const h = headParts(b);
  const lab = h.label ? nk(h.label) : undefined;
  const cm = lab?.match(/^(.*?)\s*([০-৯0-9]+)$/);
  return (
    <h2 data-b={i} className={`bk-open ${b.type === "h1" ? "bk-h1" : "bk-h2"}`}>
      {lab &&
        (cm ? (
          <span className="bk-open-label">
            <span className="bk-open-word">{cm[1]}</span>
            <span className="bk-open-num">{cm[2]}</span>
          </span>
        ) : (
          <span className="bk-open-label">
            <span className="bk-open-word">{lab}</span>
          </span>
        ))}
      <span className="bk-open-title">
        <Runs runs={h.runs} />
      </span>
      {h.sub && <span className="bk-open-sub">{h.sub}</span>}
      <span className="bk-rule" aria-hidden />
    </h2>
  );
}

function BlockView({ b, i, prev }: { b: Block; i: number; prev?: Block }) {
  const common = { "data-b": i } as Record<string, number>;
  switch (b.type) {
    case "h1":
    case "h2":
      return <Opener b={b} i={i} />;
    case "h3":
      return (
        <h4 {...common} className="bk-h3">
          <Runs runs={b.runs} bi={i} />
        </h4>
      );
    case "li":
      return (
        <p {...common} className="bk-li">
          <Runs runs={b.runs} bi={i} />
        </p>
      );
    case "quote":
      return (
        <blockquote {...common} className={isHead(prev) ? "bk-epigraph" : "bk-quote"}>
          <Runs runs={b.runs} bi={i} />
        </blockquote>
      );
    case "note": {
      const t = plain(b).trim();
      const cls = /[:：]$/.test(t) && t.length < 40 ? "bk-note bk-notes-head" : /^\[/.test(t) ? "bk-note bk-note-ref" : t.startsWith(penName) ? "bk-right bk-sign" : "bk-note";
      return (
        <p {...common} className={cls}>
          <Runs runs={b.runs} bi={i} />
        </p>
      );
    }
    case "row": {
      // a list entry: number, title in bold, kind in brackets
      const [n, title, kind] = b.runs.map((r) => r[0]);
      return (
        <p {...common} className="bk-row">
          <span className="bk-row-n">{n}</span>
          <strong className="bk-row-t">{title}</strong>
          {kind && <span className="bk-row-k">{kind}</span>}
        </p>
      );
    }
    case "right":
      return (
        <p {...common} className="bk-right">
          <Runs runs={b.runs} bi={i} />
        </p>
      );
    case "front":
      return (
        <p {...common} className="bk-front">
          <Runs runs={b.runs} bi={i} />
        </p>
      );
    default:
      return (
        <p {...common} className={prev?.type === "p" ? "bk-p" : "bk-p bk-first"}>
          <Runs runs={b.runs} bi={i} />
        </p>
      );
  }
}

/** The whole book as one flow. Rendered once per copy and never re-rendered on page turns. */
const BookFlow = memo(function BookFlow({
  book,
  body,
  pageH,
  print,
  onShare,
}: {
  book: Book;
  body: Block[];
  pageH?: number;
  print?: boolean;
  onShare: () => void;
}) {
  const S = useMemo(() => analyse(body), [body]);
  const fn = useMemo(() => footnotes(body).nums, [body]);
  const full = pageH ? { height: pageH } : undefined;
  const out: React.ReactNode[] = [];
  for (let i = S.mainStart; i < body.length; i++) {
    const b = body[i];
    if (S.parts.has(i)) {
      const h = headParts(b);
      // a short introduction right after the part title stays on the part page
      let e = i + 1;
      while (e < body.length && body[e].type === "p" && !isHead(body[e])) e++;
      const intro = body.slice(i + 1, e);
      const keep = intro.length > 0 && intro.reduce((n, x) => n + plain(x).length, 0) < 420;
      out.push(
        <section key={i} data-b={i} className="bk-part" style={pageH ? { minHeight: pageH } : undefined}>
          <span className="bk-part-label">{h.label}</span>
          <span className="bk-orn" aria-hidden>
            ❖
          </span>
          <h2 className="bk-part-title">
            <Runs runs={h.runs} />
          </h2>
          {h.sub && <p className="bk-part-sub">{h.sub}</p>}
          {keep &&
            intro.map((x, j) => (
              <p key={j} data-b={i + 1 + j} className="bk-part-intro">
                <Runs runs={x.runs} bi={i + 1 + j} />
              </p>
            ))}
        </section>
      );
      if (keep) i = e - 1;
      continue;
    }
    out.push(<BlockView key={i} b={b} i={i} prev={body[i - 1]} />);
  }
  return (
    <FnNums.Provider value={fn}>
      <figure className="bk-cover" style={full}>
        {book.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt={`${book.title} cover`} />
        )}
      </figure>
      <section className="bk-title" style={full}>
        <p className="bk-title-main">{book.title}</p>
        <span className="bk-title-rule" aria-hidden />
        <p className="bk-title-sub">{book.tagline}</p>
        <p className="bk-title-author">{penName}</p>
        <span className="bk-title-foot" aria-hidden>
          ❖
        </span>
      </section>
      {S.frontEnd > 0 && <Imprint book={book} blocks={body.slice(0, S.frontEnd)} pageH={pageH} />}
      {S.ded && (
        <section data-b={S.ded[0]} className="bk-dedication">
          <p className="bk-ded-title">উৎসর্গ</p>
          <span className="bk-orn" aria-hidden>
            ❦
          </span>
          {body.slice(S.ded[0] + 1, S.ded[1]).map((x, j) => (
            <p key={j} data-b={S.ded![0] + 1 + j} className="bk-ded-p">
              <Runs runs={x.runs} bi={S.ded![0] + 1 + j} />
            </p>
          ))}
        </section>
      )}
      {S.entries.length > 2 && (
        <nav data-b={S.tocSrc?.[0]} className="bk-contents" aria-label="সূচিপত্র">
          <h2 className="bk-contents-title">সূচিপত্র</h2>
          {S.entries.map((e) =>
            e.kind === "part" ? (
              <div key={e.i} className="bk-toc-part">
                <span className="bk-toc-plabel">{e.label}</span>
                <span className="bk-toc-row">
                  <span className="bk-toc-t">{e.title}</span>
                  <span className="bk-toc-dots" aria-hidden />
                  <span className="bk-toc-n" data-pg={e.i} />
                </span>
              </div>
            ) : (
              <div key={e.i} className={e.kind === "chapter" ? "bk-toc-ch" : "bk-toc-plain"}>
                <span className="bk-toc-row">
                  {e.num && <span className="bk-toc-num">{e.num}</span>}
                  <span className="bk-toc-t">{e.title}</span>
                  <span className="bk-toc-dots" aria-hidden />
                  <span className="bk-toc-n" data-pg={e.i} />
                </span>
                {e.desc && <span className="bk-toc-desc">{e.desc}</span>}
              </div>
            )
          )}
        </nav>
      )}
      {out}
      {!print && (
        <section className="bk-end">
          <span className="bk-orn" aria-hidden>
            ❖
          </span>
          <p className="bk-end-title">পড়ার জন্য ধন্যবাদ</p>
          <p className="bk-end-text">ভালো লাগলে বন্ধুদের সাথে শেয়ার করুন, আর গেস্টবুকে আপনার মতামত লিখে যান।</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={onShare} data-act="share" className="rounded-lg bg-emerald-600 px-4 py-2 font-sans text-sm font-medium text-white">
              Share
            </button>
            <Link href="/#guestbook" className="rounded-lg border border-current/20 px-4 py-2 font-sans text-sm font-medium">
              Guestbook
            </Link>
            <a href={book.pdf} download className="rounded-lg border border-current/20 px-4 py-2 font-sans text-sm font-medium">
              PDF
            </a>
          </div>
        </section>
      )}
      {print && (
        <section className="bk-colophon">
          <span className="bk-orn" aria-hidden>
            ❖
          </span>
          <p>সমাপ্ত</p>
        </section>
      )}
    </FnNums.Provider>
  );
});

/* ------------------------------------------------------------------ */
/* Typesetter: footnotes at the foot of the page they belong to.        */
/* Works on a copy of the flow: for each page that has note markers it  */
/* measures the notes, then ends the text early (splitting a paragraph  */
/* at a line start) so the notes fit underneath.                        */
/* ------------------------------------------------------------------ */
type Note = { num: string; text: string };
type Typeset = { node: HTMLElement; n: number; blockCol: number[]; notes: Record<number, Note[]> };
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const noteHtml = (ns: Note[]) => ns.map((x) => `<p class="bk-fnp"><span class="bk-fnn">${esc(x.num)}</span>${esc(x.text)}</p>`).join("");

function typeset(src: HTMLElement, g: Geo, fnText: Map<string, string>): Typeset {
  const host = src.parentElement!;
  const sand = src.cloneNode(true) as HTMLElement;
  Object.assign(sand.style, { position: "absolute", left: "0px", top: "0px", transform: "none", visibility: "hidden" });
  host.appendChild(sand);
  const meas = document.createElement("div");
  meas.className = "bk-fnzone";
  meas.style.cssText = `position:absolute;left:0;top:0;width:${g.colW}px;visibility:hidden`;
  host.appendChild(meas);

  const b0 = () => sand.getBoundingClientRect();
  const colOf = (r: DOMRect, o: DOMRect) => Math.max(0, Math.floor((r.left - o.left + 4) / g.stride));
  const count = () => Math.max(1, Math.round((sand.scrollWidth + g.gap) / g.stride));
  const hOf = (ns: Note[]) => {
    if (!ns.length) return 0;
    meas.innerHTML = noteHtml(ns);
    return Math.ceil(meas.getBoundingClientRect().height);
  };
  const cap = g.contentH * 0.55;
  const capped = (ns: Note[]) => {
    const out: Note[] = [];
    for (const x of ns) {
      if (out.length && hOf([...out, x]) > cap) break;
      out.push(x);
    }
    return out;
  };
  // markers on column p, in reading order
  let sups: HTMLElement[] = [];
  const markersOn = (p: number): Note[] => {
    const o = b0();
    return sups
      .filter((el) => {
        const r = el.getClientRects()[0];
        return r && colOf(r, o) === p;
      })
      .map((el) => ({ num: el.textContent ?? "", text: fnText.get(el.dataset.fn ?? "") ?? "", key: el.dataset.fn } as Note));
  };

  /** End column p's text above `limit` px. */
  const breakAt = (p: number, limit: number): (() => void) | undefined => {
    const o = b0();
    const yMax = o.top + limit + 0.5;
    for (const c of Array.from(sand.children) as HTMLElement[]) {
      const frs = Array.from(c.getClientRects()).filter((r) => r.width > 0 || r.height > 0);
      if (!frs.length) continue;
      const on = frs.filter((r) => colOf(r, o) === p);
      if (!on.length) {
        if (colOf(frs[0], o) > p) return; // column p ends above the limit
        continue;
      }
      if (on[on.length - 1].bottom <= yMax) continue;
      const startsHere = colOf(frs[0], o) === p;
      const pushWhole = () => {
        if (!startsHere || on[0].top <= o.top + 1) return undefined;
        const old = c.style.breakBefore;
        c.style.breakBefore = "column";
        return () => {
          c.style.breakBefore = old;
        };
      };
      if (on[0].top >= yMax - 1 || (c.tagName !== "P" && c.tagName !== "BLOCKQUOTE")) return pushWhole();
      // split the paragraph at the first line that does not fit
      const nodes: Text[] = [];
      const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
      while (tw.nextNode()) nodes.push(tw.currentNode as Text);
      // every place a line can start: skip vowel signs, marks and letters joined by a hasant
      const cand: [Text, number][] = [];
      const joins = /[\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u09E2\u09E3\u200C\u200D\s]/;
      let prev = " ";
      for (const t of nodes) {
        const d = t.data;
        for (let k = 0; k < d.length; k++) {
          if (!joins.test(d[k]) && prev !== "\u09CD") cand.push([t, k]);
          prev = d[k];
        }
      }
      const rg = document.createRange();
      const fits = ([t, k]: [Text, number]) => {
        rg.setStart(t, k);
        rg.setEnd(t, Math.min(t.data.length, k + 1));
        const r = rg.getClientRects()[0];
        if (!r) return true;
        const cc = colOf(r, o);
        return cc < p || (cc === p && r.bottom <= yMax);
      };
      let lo = 0;
      let hi = cand.length; // first index that does not fit
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (fits(cand[mid])) lo = mid + 1;
        else hi = mid;
      }
      if (hi >= cand.length) return;
      if (hi === 0) return pushWhole();
      const [t, k] = cand[hi];
      rg.setStart(t, k);
      rg.setEnd(c, c.childNodes.length);
      const rest = rg.extractContents();
      const c2 = c.cloneNode(false) as HTMLElement;
      c2.removeAttribute("data-b");
      c2.classList.add("bk-cont");
      c2.style.breakBefore = "column";
      c2.appendChild(rest);
      c.after(c2);
      c.classList.add("bk-split");
      return () => {
        c.classList.remove("bk-split");
        while (c2.firstChild) c.appendChild(c2.firstChild);
        c2.remove();
      };
    }
  };

  const notes: Record<number, Note[]> = {};
  if (fnText.size) {
    sups = Array.from(sand.querySelectorAll<HTMLElement>("sup[data-fn]"));
    let carry: Note[] = [];
    for (let p = 0; p < count() && p < 3000; p++) {
      const here0 = [...carry, ...markersOn(p)];
      if (!here0.length) continue;
      const accept = (list: Note[]) => {
        const show = capped(list);
        if (show.length) notes[p] = show;
        carry = list.slice(show.length);
      };
      let here = here0;
      for (let it = 0; it < 3; it++) {
        const undo = breakAt(p, g.contentH - hOf(capped(here)));
        const after = [...carry, ...markersOn(p)];
        if (after.length === here.length) {
          accept(after);
          break;
        }
        undo?.();
        if (after.length > here.length || it === 2) {
          // a smaller space pulls the marker back: keep the first, safe layout
          breakAt(p, g.contentH - hOf(capped(here0)));
          accept([...carry, ...markersOn(p)]);
          break;
        }
        // a marker moved to the next page: try again with less room for notes
        here = after;
        if (!here.length) break;
      }
    }
  }

  const o = b0();
  const blockCol: number[] = [];
  sand.querySelectorAll<HTMLElement>("[data-b]").forEach((node) => {
    const i = Number(node.dataset.b);
    if (blockCol[i] !== undefined) return;
    const r = node.getClientRects()[0];
    if (r) blockCol[i] = colOf(r, o);
  });
  sand.querySelectorAll<HTMLElement>("[data-pg]").forEach((el) => {
    const c = blockCol[Number(el.dataset.pg)];
    el.textContent = c === undefined ? "" : bnDigits(c + 1);
  });
  const n = count();
  sand.remove();
  meas.remove();
  return { node: sand, n, blockCol, notes };
}

type Geo = { pageW: number; paperH: number; px: number; pt: number; pb: number; colW: number; gap: number; stride: number; contentH: number; small: boolean };

/** One physical page: a window onto column `col` of the book flow. */
function PageFace({
  col,
  geo,
  flow,
  head,
  num,
  contentRef,
  muted,
  paper,
  edge,
  shift = 0,
  tpl,
  notes,
  live,
}: {
  live?: boolean;
  shift?: number;
  tpl?: HTMLElement | null;
  notes?: Note[];
  col: number | null;
  geo: Geo;
  flow?: React.ReactNode;
  head?: string | null;
  num?: string | null;
  contentRef?: React.Ref<HTMLDivElement>;
  muted: string;
  paper: string;
  edge?: "left" | "right";
}) {
  const { pageW, paperH, px, pt, colW, gap, stride, contentH, small } = geo;
  const fillRef = useRef<HTMLDivElement>(null);
  // pages show a copy of the typeset flow (the measured copy keeps the React tree)
  useLayoutEffect(() => {
    const el = fillRef.current;
    if (!el || contentRef) return;
    if (!tpl) el.replaceChildren();
    else el.replaceChildren(...Array.from((tpl.cloneNode(true) as HTMLElement).childNodes));
  }, [tpl, contentRef]);
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ width: pageW, height: paperH, background: paper }}>
      {head && (
        <div className="pointer-events-none absolute truncate text-center font-bn text-[11px] tracking-wide" style={{ left: px + shift, width: colW, top: small ? 16 : 32, color: muted }}>
          {head}
        </div>
      )}
      <div className="absolute" style={{ left: px + shift, top: pt, width: colW, height: contentH, visibility: col === null ? "hidden" : undefined }}>
        <div
          ref={contentRef ?? fillRef}
          className="bk-content"
          aria-hidden={live ? undefined : true}
          style={{
            columnWidth: colW,
            columnGap: gap,
            columnFill: "auto",
            width: colW,
            height: contentH,
            ["--bk-pageh" as string]: `${contentH}px`,
            transform: `translateX(${-(col ?? 0) * stride}px)`,
          }}
        >
          {contentRef ? flow : null}
        </div>
      </div>
      {notes && notes.length > 0 && col !== null && (
        <div className="bk-fnzone absolute" style={{ left: px + shift, width: colW, bottom: paperH - pt - contentH }} dangerouslySetInnerHTML={{ __html: noteHtml(notes) }} />
      )}
      {num && (
        <div className="pointer-events-none absolute text-center font-bn text-xs" style={{ left: px + shift, width: colW, bottom: small ? 16 : 28, color: muted }}>
          {num}
        </div>
      )}
      {/* subtle gutter shading next to the spine */}
      {edge && (
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{
            [edge === "left" ? "right" : "left"]: 0,
            width: 46,
            background: `linear-gradient(to ${edge === "left" ? "left" : "right"}, rgba(60,40,10,.16), transparent)`,
          }}
        />
      )}
    </div>
  );
}

export function Reader({ book }: { book: Book }) {
  const { unlock, toast } = useApp();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [mode, setMode] = useState<Mode>("page");
  const [fontSize, setFontSize] = useState(18);
  const [dims, setDims] = useState({ W: 0, H: 0 });
  const [page, setPage] = useState(0);
  const [nPages, setNPages] = useState(1);
  const [blockCol, setBlockCol] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [flip, setFlip] = useState<Flip | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [scrollPage, setScrollPage] = useState(0);
  const [sound, setSound] = useState(true);
  const [print, setPrint] = useState(false);
  const [tpl, setTpl] = useState<HTMLElement | null>(null);
  const [pageNotes, setPageNotes] = useState<Record<number, Note[]>>({});
  const soundRef = useRef(true);
  const audioRef = useRef<AudioContext | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(-1); // -1 = the cover
  const pointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const flipId = useRef(0);
  const reduceMotion = useRef(false);
  const leafRef = useRef<HTMLDivElement>(null);
  const frontShadeRef = useRef<HTMLDivElement>(null);
  const backShadeRef = useRef<HTMLDivElement>(null);
  const castShadowRef = useRef<HTMLDivElement>(null);

  const body = useMemo(() => (blocks ?? []).filter((b) => b.type !== "front-h1" && b.type !== "front-h2"), [blocks]);
  const fnText = useMemo(() => footnotes(body).text, [body]);

  /* ---------- load text + preferences ---------- */
  useEffect(() => {
    // ?print renders every page at A5 size for the PDF (scripts/book-text/make-pdf.cjs)
    const isPrint = new URLSearchParams(window.location.search).has("print");
    if (!isPrint) unlock("reader");
    reduceMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setTheme(isPrint ? "light" : load<Theme>("reader:theme", "light"));
    setMode(isPrint ? "scroll" : load<Mode>("reader:mode", "page"));
    setFontSize(isPrint ? 15 : load<number>("reader:font", 18));
    setPrint(isPrint);
    soundRef.current = load<boolean>("reader:sound", true);
    setSound(soundRef.current);
    const saved = isPrint ? null : load<SavedPos | null>(`readpos:${book.slug}`, null);
    if (saved && saved.b > 2) {
      anchorRef.current = saved.b;
      setResumed(true);
    }
    let cancelled = false;
    fetch(book.text!)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Block[]) => !cancelled && setBlocks(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [book.slug, book.text, unlock]);

  /* ---------- measure the stage ---------- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ W: el.clientWidth, H: el.clientHeight }));
    ro.observe(el);
    setDims({ W: el.clientWidth, H: el.clientHeight });
    return () => ro.disconnect();
  }, [print]);

  /* ---------- page geometry ---------- */
  const { W, H } = dims;
  const small = W < 640;
  const cols = W >= 1000 && H >= 460 ? 2 : 1;
  const m = small ? 8 : 24;
  const vm = small ? 8 : 18;
  const paperH = Math.max(320, H - 2 * vm);
  const pageW = Math.floor(cols === 2 ? Math.min(540, (W - 2 * m) / 2, paperH / 1.32) : Math.min(660, W - 2 * m, small ? 9999 : paperH / 1.25));
  const px = small ? 22 : cols === 2 ? 44 : 52;
  const pt = small ? 46 : 78;
  const pb = small ? 46 : 68;
  const colW = Math.max(120, pageW - 2 * px);
  const gap = 2 * px;
  const stride = colW + gap;
  const contentH = Math.max(160, paperH - pt - pb);
  const geo: Geo = { pageW, paperH, px, pt, pb, colW, gap, stride, contentH, small };

  // scroll mode: the same pages, stacked one under another like a PDF
  const sPageW = Math.floor(Math.min(small ? 9999 : 640, W - 2 * m));
  const sPaperH = Math.round(sPageW * (small ? 1.55 : 1.4));
  const sColW = Math.max(120, sPageW - 2 * px);
  const PRINT_W = 559; // A5 at 96 dpi
  const PRINT_H = 793;
  const sgeo: Geo = print
    ? { pageW: PRINT_W, paperH: PRINT_H, px: 54, pt: 62, pb: 58, colW: PRINT_W - 108, gap: 108, stride: PRINT_W, contentH: PRINT_H - 120, small: false }
    : { pageW: sPageW, paperH: sPaperH, px, pt, pb, colW: sColW, gap, stride: sColW + gap, contentH: Math.max(160, sPaperH - pt - pb), small };
  const gapY = small ? 14 : 28;
  const pitch = sPaperH + gapY;
  const G = mode === "page" ? geo : sgeo;
  const C = mode === "page" ? cols : 1;

  /* ---------- paginate (page mode) ---------- */
  const relayout = useCallback(() => {
    const el = contentRef.current;
    if (!el || !blocks) return;
    const t = typeset(el, G, fnText);
    const n = t.n;
    const cols_ = t.blockCol;
    setTpl(t.node);
    setPageNotes(t.notes);
    setNPages(n);
    setBlockCol(cols_);
    const a = anchorRef.current < 0 ? 0 : cols_[anchorRef.current] ?? 0;
    const p = Math.min(Math.floor(a / C) * C, Math.max(0, Math.floor((n - 1) / C) * C));
    setFlip(null);
    setPage(p);
    if (mode === "scroll") {
      setScrollPage(p);
      requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = p * pitch;
      });
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, G.gap, G.stride, G.colW, G.contentH, C, mode, pitch, fnText]);

  useLayoutEffect(() => {
    if (!blocks || !W) return;
    let raf = requestAnimationFrame(() => relayout());
    document.fonts?.ready.then(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => relayout());
    });
    return () => cancelAnimationFrame(raf);
  }, [blocks, W, H, fontSize, C, mode, relayout]);

  /* ---------- scroll mode: track which page is on screen ---------- */
  const onScroll = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc || !ready) return;
    const p = Math.max(0, Math.min(nPages - 1, Math.floor((sc.scrollTop + sc.clientHeight * 0.35 - gapY) / pitch)));
    setScrollPage((old) => {
      if (old === p) return old;
      let a = -1;
      for (let i = 0; i < blockCol.length; i++) if ((blockCol[i] ?? 0) <= p) a = i;
      if (sc.scrollTop < 40) a = -1;
      anchorRef.current = a;
      save(`readpos:${book.slug}`, { b: a, pct: Math.min(100, Math.round(((p + 1) / nPages) * 100)) });
      return p;
    });
  }, [book.slug, blockCol, gapY, nPages, pitch, ready]);

  /* ---------- turning pages ---------- */
  const lastPageStart = Math.max(0, Math.floor((nPages - 1) / cols) * cols);
  const commit = useCallback(
    (target: number) => {
      setPage(target);
      let a = -1;
      for (let i = 0; i < blockCol.length; i++) if ((blockCol[i] ?? 0) <= target) a = i;
      anchorRef.current = a;
      const pct = Math.min(100, Math.round(((target + cols) / nPages) * 100));
      save(`readpos:${book.slug}`, { b: a, pct });
    },
    [blockCol, book.slug, cols, nPages]
  );
  const goTo = useCallback(
    (p: number) => {
      const target = Math.max(0, Math.min(lastPageStart, Math.floor(p / cols) * cols));
      setFlip(null);
      commit(target);
    },
    [commit, cols, lastPageStart]
  );
  const turn = useCallback(
    (dir: "next" | "prev") => {
      const target = Math.max(0, Math.min(lastPageStart, page + (dir === "next" ? cols : -cols)));
      if (target === page) return;
      if (!reduceMotion.current) setFlip({ dir, from: page, to: target, id: ++flipId.current });
      if (soundRef.current) playPageTurn(audioRef);
      commit(target);
    },
    [page, cols, lastPageStart, commit]
  );
  const next = useCallback(() => turn("next"), [turn]);
  const prev = useCallback(() => turn("prev"), [turn]);

  // run the flip with the Web Animations API (no re-render of the text while it plays)
  useLayoutEffect(() => {
    if (!flip || !leafRef.current) return;
    const single = cols === 1;
    const from = single && flip.dir === "prev" ? -180 : 0;
    const to = single ? (flip.dir === "next" ? -180 : 0) : flip.dir === "next" ? -180 : 180;
    const opts: KeyframeAnimationOptions = { duration: FLIP_MS, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" };
    const anims = [
      leafRef.current.animate([{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${(from + to) / 2}deg) translateZ(30px)` }, { transform: `rotateY(${to}deg)` }], opts),
      frontShadeRef.current?.animate(from === 0 ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], opts),
      backShadeRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], opts),
      castShadowRef.current?.animate([{ opacity: from === 0 ? 0 : 1 }, { opacity: 0.8 }, { opacity: from === 0 ? 0 : 0 }], opts),
    ];
    return () => anims.forEach((a) => a?.cancel());
  }, [flip, cols]);

  // finish the flip animation
  useEffect(() => {
    if (!flip) return;
    const t = setTimeout(() => setFlip((f) => (f && f.id === flip.id ? null : f)), FLIP_MS + 30);
    return () => clearTimeout(t);
  }, [flip]);

  const changeFont = useCallback(
    (d: number) =>
      setFontSize((f) => {
        const v = Math.max(14, Math.min(26, f + d));
        save("reader:font", v);
        return v;
      }),
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "+" || e.key === "=") return changeFont(1);
      if (e.key === "-") return changeFont(-1);
      if (e.key.toLowerCase() === "t") return setTocOpen((v) => !v);
      if (mode !== "page") return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(nPages);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, nPages, mode, changeFont]);

  const changeTheme = (t: Theme) => {
    setTheme(t);
    save("reader:theme", t);
  };
  const toggleSound = () => {
    soundRef.current = !soundRef.current;
    setSound(soundRef.current);
    save("reader:sound", soundRef.current);
    if (soundRef.current) playPageTurn(audioRef);
  };
  const changeMode = (md: Mode) => {
    if (md === mode) return;
    setReady(false);
    setFlip(null);
    setMode(md);
    save("reader:mode", md);
  };

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${book.title} · ${penName}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", desc: "Share it with a friend.", tone: "info" });
      }
    } catch {
      /* share dismissed */
    }
  }, [book.title, toast]);

  /* ---------- contents ---------- */
  const struct = useMemo(() => analyse(body), [body]);
  const toc = useMemo(
    () =>
      body
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.type === "h1" || b.type === "h2")
        .map(({ b, i }) => {
          const t = plain(b).trim();
          return { i, level: b.type, title: t.startsWith("সূচিপত্র") ? "সূচিপত্র" : b.label ? `${b.label}: ${t}` : t, head: headTitle(headParts(b)) };
        }),
    [body]
  );
  const chapterAt = useCallback((p: number) => [...toc].reverse().find((c) => (blockCol[c.i] ?? Infinity) <= p), [toc, blockCol]);
  const chapter = chapterAt(mode === "page" ? page : scrollPage);
  // front matter (title, imprint, dedication, contents) carries no running head or folio
  const mainCol = blockCol[struct.mainStart] ?? 2;
  const openingCols = useMemo(() => new Set(toc.map((c) => blockCol[c.i])), [toc, blockCol]);
  const partCols = useMemo(() => new Set([...struct.parts].map((i) => blockCol[i])), [struct, blockCol]);

  const jumpToBlock = (i: number) => {
    if (mode === "page") return goTo(i < 0 ? 0 : blockCol[i] ?? 0);
    const p = i < 0 ? 0 : blockCol[i] ?? 0;
    scrollRef.current?.scrollTo({ top: p * pitch });
  };

  const T = THEMES[theme];
  const dark = T.chrome === "dark";
  const bar = dark ? "border-white/10 bg-[#11141b]/95 text-slate-200" : "border-black/10 bg-white/90 text-slate-800";
  const shownTo = Math.min(nPages, page + cols);

  // running heads: book title on the left-hand (even) page, chapter on the right-hand (odd) page
  const headFor = (p: number | null, left?: boolean) => {
    if (p === null || p < mainCol || p >= nPages || openingCols.has(p)) return null;
    const verso = C === 2 ? !!left : (p + 1) % 2 === 0;
    return verso ? book.title : chapterAt(p)?.head ?? book.title;
  };
  const numFor = (p: number | null) => (p === null || p < mainCol || p >= nPages || partCols.has(p) ? null : bnDigits(p + 1));

  /* ---------- gestures (page mode) ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = pointer.current;
    pointer.current = null;
    if (!s || mode !== "page") return;
    if ((e.target as HTMLElement).closest("a,button,input")) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) next();
      else prev();
      return;
    }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - s.t < 450 && !window.getSelection()?.toString()) {
      const r = stageRef.current!.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x < 0.3) prev();
      else if (x > 0.7) next();
    }
  };

  const cssVars = {
    "--bk-ink": T.ink,
    "--bk-muted": T.muted,
    "--bk-accent": T.accent,
    "--bk-paper": T.paper,
    "--bk-size": `${fontSize}px`,
  } as React.CSSProperties;

  // one memoized flow per copy so page turns never re-render the text
  const flowPaged = useMemo(() => (blocks ? <BookFlow book={book} body={body} pageH={G.contentH} print={print} onShare={share} /> : null), [blocks, book, body, G.contentH, print, share]);

  /* ---------- which page sits where (page mode) ---------- */
  // Static pages under the turning leaf, and the leaf's two faces.
  let base: (number | null)[];
  let leaf: { front: number | null; back: number | null; side: "left" | "right" | "single"; from: number; to: number } | null = null;
  if (cols === 2) {
    if (flip?.dir === "next") {
      base = [flip.from, flip.to + 1];
      leaf = { front: flip.from + 1, back: flip.to, side: "right", from: 0, to: -180 };
    } else if (flip?.dir === "prev") {
      base = [flip.to, flip.from + 1];
      leaf = { front: flip.from, back: flip.to + 1, side: "left", from: 0, to: 180 };
    } else base = [page, page + 1];
  } else {
    if (flip?.dir === "next") {
      base = [flip.to];
      leaf = { front: flip.from, back: null, side: "single", from: 0, to: -180 };
    } else if (flip?.dir === "prev") {
      base = [flip.from];
      leaf = { front: flip.to, back: null, side: "single", from: -180, to: 0 };
    } else base = [page];
  }
  const vis = (p: number | null) => (p === null || p >= nPages ? null : p);

  if (print)
    return (
      <div ref={stageRef} className="bk-print" data-reader-ready={ready ? "true" : undefined} data-pages={nPages} style={{ ...cssVars, color: T.ink, background: "#fff", width: PRINT_W }}>
        <div aria-hidden className="pointer-events-none absolute left-0 top-0" style={{ visibility: "hidden", width: PRINT_W, height: PRINT_H }}>
          <PageFace col={0} geo={sgeo} flow={flowPaged} contentRef={contentRef} muted={T.muted} paper="#fff" />
        </div>
        {ready &&
          Array.from({ length: nPages }, (_, p) => (
            <div key={p} className="bk-print-page relative overflow-hidden" style={{ width: PRINT_W, height: PRINT_H, breakAfter: "page" }}>
              {p === 0 && book.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <PageFace col={p} geo={sgeo} tpl={tpl} notes={pageNotes[p]} head={headFor(p)} num={numFor(p)} muted={T.muted} paper="#fff" shift={(p + 1) % 2 ? 8 : -8} />
              )}
            </div>
          ))}
      </div>
    );

  return (
    <div
      className="flex h-[100svh] flex-col overflow-hidden"
      style={{ background: T.bg }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest?.("[data-act=share]")) share();
      }}
    >
      {/* Top bar */}
      <header className={`relative z-20 border-b ${bar} backdrop-blur`}>
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
          <Link href="/#books" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-black/5" aria-label="Back to portfolio">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bnserif text-sm font-semibold">{book.title}</p>
            <p className="truncate font-bn text-[11px] opacity-60">{chapter?.title ?? penName}</p>
          </div>
          <button
            onClick={() => changeMode(mode === "page" ? "scroll" : "page")}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs hover:bg-black/5"
            aria-label={mode === "page" ? "Switch to scroll mode" : "Switch to page mode"}
            title={mode === "page" ? "Scroll up and down" : "Turn pages"}
          >
            {mode === "page" ? <ScrollText size={17} /> : <BookOpen size={17} />}
            <span className="hidden font-bn md:inline">{mode === "page" ? "স্ক্রল" : "পাতা"}</span>
          </button>
          <div className="relative">
            <button onClick={() => setSettingsOpen((v) => !v)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5" aria-label="Reading settings" aria-expanded={settingsOpen}>
              <Type size={17} />
            </button>
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`absolute right-0 top-11 w-64 rounded-xl border p-3 shadow-xl ${dark ? "border-white/10 bg-[#1a1d24]" : "border-black/10 bg-white"}`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider opacity-60">Reading mode</p>
                  <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Reading mode">
                    {(
                      [
                        ["page", "পাতা উল্টে", BookOpen],
                        ["scroll", "স্ক্রল করে", ScrollText],
                      ] as const
                    ).map(([id, label, Icon]) => (
                      <button
                        key={id}
                        role="radio"
                        aria-checked={mode === id}
                        onClick={() => changeMode(id)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 font-bn text-xs ${mode === id ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-current/15"}`}
                      >
                        <Icon size={14} /> {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-wider opacity-60">Page-turn sound</p>
                  <button
                    onClick={toggleSound}
                    role="switch"
                    aria-checked={sound}
                    aria-label="Page-turn sound"
                    className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 font-bn text-xs ${sound ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-current/15"}`}
                  >
                    {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} {sound ? "শব্দ চালু" : "শব্দ বন্ধ"}
                  </button>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-wider opacity-60">Text size</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button onClick={() => changeFont(-1)} className="grid h-9 w-12 place-items-center rounded-lg border border-current/15 hover:bg-black/5" aria-label="Smaller text">
                      <Minus size={15} />
                    </button>
                    <span className="font-bnserif text-sm">অ {bnDigits(fontSize)}</span>
                    <button onClick={() => changeFont(1)} className="grid h-9 w-12 place-items-center rounded-lg border border-current/15 hover:bg-black/5" aria-label="Larger text">
                      <Plus size={15} />
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-wider opacity-60">Page colour</p>
                  <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Reading theme">
                    {(Object.keys(THEMES) as Theme[]).map((t) => (
                      <button
                        key={t}
                        role="radio"
                        aria-checked={theme === t}
                        onClick={() => changeTheme(t)}
                        className={`rounded-lg border px-2 py-2 text-xs ${theme === t ? "ring-2 ring-emerald-500" : "border-black/10"}`}
                        style={{ background: THEMES[t].paper, color: THEMES[t].ink }}
                      >
                        {THEMES[t].label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-black/5 md:grid"
            aria-label="Full screen"
          >
            <Maximize size={16} />
          </button>
          <button onClick={share} className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-black/5 sm:grid" aria-label="Share">
            <Share2 size={16} />
          </button>
          <a href={book.pdf} download className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-black/5 sm:grid" aria-label="Download PDF">
            <Download size={16} />
          </a>
          <button onClick={() => setTocOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700" aria-label="Contents">
            <List size={16} /> <span className="hidden font-bn sm:inline">সূচিপত্র</span>
          </button>
        </div>
        <div className="h-0.5 bg-black/5">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((mode === "page" ? shownTo : scrollPage + 1) / nPages) * 100}%` }} />
        </div>
      </header>

      {/* Book */}
      <div
        ref={stageRef}
        className={`relative flex flex-1 select-text items-center justify-center overflow-hidden ${mode === "page" ? "touch-pan-y" : ""}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={() => setSettingsOpen(false)}
      >
        {error && (
          <div className="mx-4 max-w-md rounded-xl bg-white p-6 text-center text-slate-800 shadow">
            <p className="font-semibold">This browser could not open the reader.</p>
            <a href={book.pdf} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
              <Download size={15} /> Open the PDF instead
            </a>
          </div>
        )}
        {!ready && !error && (
          <div className="absolute inset-0 z-10 grid place-items-center" style={{ background: T.bg }}>
            <div className="text-center" style={{ color: T.ink }}>
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="mt-3 font-bn text-sm">বই খোলা হচ্ছে…</p>
            </div>
          </div>
        )}

        {/* ---------------- page mode ---------------- */}
        {blocks && W > 0 && mode === "page" && (
          <div
            className="bk-paper relative"
            data-reader-ready={ready ? "true" : undefined}
            data-page={page + 1}
            style={{ ...cssVars, width: pageW * cols, height: paperH, color: T.ink, perspective: 2400 }}
          >
            {/* page block shadow + paper edges */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[3px]"
              style={{ boxShadow: dark ? "0 10px 40px rgba(0,0,0,.6)" : "0 2px 6px rgba(0,0,0,.08), 0 18px 50px rgba(60,40,10,.18), 3px 3px 0 -1px " + T.back + ", 6px 6px 0 -2px " + T.back }}
            />
            {/* hidden copy used only to measure and typeset */}
            <div aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-hidden" style={{ visibility: "hidden", width: pageW, height: paperH }}>
              <PageFace col={0} geo={geo} flow={flowPaged} contentRef={contentRef} muted={T.muted} paper={T.paper} />
            </div>
            {/* static pages */}
            {base.map((p, k) => (
              <div key={`base${k}`} className="absolute top-0 overflow-hidden" style={{ left: k * pageW, width: pageW, height: paperH }}>
                <PageFace
                  col={vis(p)}
                  geo={geo}
                  tpl={tpl}
                  notes={pageNotes[vis(p) ?? -1]}
                  live={k === 0}
                  head={headFor(vis(p), k === 0)}
                  num={numFor(vis(p))}
                  muted={T.muted}
                  paper={T.paper}
                  edge={cols === 2 ? (k === 0 ? "left" : "right") : undefined}
                />
              </div>
            ))}

            {/* the turning leaf (always mounted so turns are instant) */}
            <div
              ref={leafRef}
              className="absolute top-0"
              style={{
                left: leaf?.side === "right" ? pageW : 0,
                width: pageW,
                height: paperH,
                transformStyle: "preserve-3d",
                transformOrigin: leaf?.side === "left" ? "right center" : "left center",
                visibility: leaf ? "visible" : "hidden",
                zIndex: 5,
              }}
            >
              {/* front face */}
              <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                <PageFace
                  col={leaf ? vis(leaf.front) : null}
                  geo={geo}
                  tpl={tpl}
                  notes={leaf ? pageNotes[vis(leaf.front) ?? -1] : undefined}
                  head={leaf ? headFor(vis(leaf.front), leaf.side === "left") : null}
                  num={leaf ? numFor(vis(leaf.front)) : null}
                  muted={T.muted}
                  paper={T.paper}
                  edge={leaf?.side === "left" ? "left" : leaf?.side === "right" ? "right" : undefined}
                />
                <div
                  ref={frontShadeRef}
                  className="pointer-events-none absolute inset-0"
                  style={{ opacity: 0, background: `linear-gradient(${leaf?.side === "left" ? "to left" : "to right"}, rgba(0,0,0,0), rgba(0,0,0,.3))` }}
                />
              </div>
              {/* back face */}
              <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                {leaf?.back != null ? (
                  <PageFace
                    col={vis(leaf.back)}
                    geo={geo}
                    tpl={tpl}
                    notes={pageNotes[vis(leaf.back) ?? -1]}
                    head={headFor(vis(leaf.back), leaf.side === "right")}
                    num={numFor(vis(leaf.back))}
                    muted={T.muted}
                    paper={T.paper}
                    edge={leaf.side === "right" ? "left" : "right"}
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: T.back }} />
                )}
                <div
                  ref={backShadeRef}
                  className="pointer-events-none absolute inset-0"
                  style={{ opacity: 0, background: `linear-gradient(${leaf?.side === "right" ? "to right" : "to left"}, rgba(0,0,0,0), rgba(0,0,0,.25))` }}
                />
              </div>
            </div>
            {/* shadow the leaf casts on the page underneath */}
            <div
              ref={castShadowRef}
              className="pointer-events-none absolute top-0 z-[4]"
              style={{
                left: leaf?.side === "right" ? pageW : 0,
                width: pageW,
                height: paperH,
                opacity: 0,
                background: `linear-gradient(${leaf?.side === "left" ? "to right" : "to left"}, rgba(0,0,0,.25), rgba(0,0,0,0) 70%)`,
              }}
            />

            {/* spine for the two-page spread */}
            {cols === 2 && (
              <div
                className="pointer-events-none absolute inset-y-0 z-10"
                style={{
                  left: pageW - 18,
                  width: 36,
                  background: dark
                    ? "linear-gradient(to right, transparent, rgba(0,0,0,.45) 50%, transparent)"
                    : "linear-gradient(to right, transparent, rgba(80,60,30,.22) 50%, transparent)",
                }}
              />
            )}
          </div>
        )}

        {/* ---------------- scroll mode: pages stacked like a PDF ---------------- */}
        {blocks && W > 0 && mode === "scroll" && (
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
            data-reader-ready={ready ? "true" : undefined}
            data-mode="scroll"
            data-page={scrollPage + 1}
            style={{ ...cssVars, color: T.ink }}
          >
            {/* hidden copy used only to measure where pages break */}
            <div aria-hidden className="pointer-events-none absolute left-0 top-0" style={{ visibility: "hidden", width: sPageW, height: sPaperH }}>
              <PageFace col={0} geo={sgeo} flow={flowPaged} contentRef={contentRef} muted={T.muted} paper={T.paper} />
            </div>
            <div className="flex flex-col items-center" style={{ padding: `${gapY}px 0`, gap: gapY }}>
              {Array.from({ length: nPages }, (_, p) => (
                <div
                  key={p}
                  className="relative shrink-0 overflow-hidden rounded-[3px]"
                  style={{
                    width: sPageW,
                    height: sPaperH,
                    background: T.paper,
                    boxShadow: dark ? "0 8px 30px rgba(0,0,0,.55)" : "0 1px 3px rgba(0,0,0,.08), 0 10px 30px rgba(60,40,10,.16)",
                  }}
                >
                  {ready && Math.abs(p - scrollPage) <= 2 ? (
                    <PageFace col={p} geo={sgeo} tpl={tpl} notes={pageNotes[p]} head={headFor(p, false)} num={numFor(p)} muted={T.muted} paper={T.paper} />
                  ) : (
                    numFor(p) && (
                      <div className="absolute inset-x-0 text-center font-bn text-xs" style={{ bottom: small ? 16 : 28, color: T.muted }}>
                        {numFor(p)}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* edge arrows on larger screens */}
        {ready && !small && mode === "page" && (
          <>
            <button onClick={prev} disabled={page <= 0} aria-label="Previous page" className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full opacity-50 transition hover:bg-black/10 hover:opacity-100 disabled:hidden md:grid" style={{ color: T.ink }}>
              <ChevronLeft size={26} />
            </button>
            <button onClick={next} disabled={page >= lastPageStart} aria-label="Next page" className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full opacity-50 transition hover:bg-black/10 hover:opacity-100 disabled:hidden md:grid" style={{ color: T.ink }}>
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <footer className={`z-20 border-t ${bar} backdrop-blur`}>
        {mode === "page" ? (
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
            <button onClick={prev} disabled={page <= 0} className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm hover:bg-black/5 disabled:opacity-30 sm:px-3" aria-label="Previous page">
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
            </button>
            <label htmlFor="page-slider" className="sr-only">
              Go to page
            </label>
            <input
              id="page-slider"
              type="range"
              min={1}
              max={Math.max(1, nPages)}
              step={1}
              value={Math.min(nPages, page + 1)}
              onChange={(e) => goTo(Number(e.target.value) - 1)}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-emerald-600"
            />
            <span className="shrink-0 font-bn text-xs tabular-nums opacity-80" aria-live="polite" data-testid="page-indicator">
              পৃষ্ঠা {bnDigits(Math.min(nPages, page + 1))}
              {cols === 2 && shownTo > page + 1 ? `–${bnDigits(shownTo)}` : ""} / {bnDigits(nPages)}
            </span>
            <button onClick={next} disabled={page >= lastPageStart} className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm hover:bg-black/5 disabled:opacity-30 sm:px-3" aria-label="Next page">
              <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
            <ScrollText size={16} className="shrink-0 opacity-60" />
            <label htmlFor="scroll-slider" className="sr-only">
              Go to page
            </label>
            <input
              id="scroll-slider"
              type="range"
              min={1}
              max={Math.max(1, nPages)}
              step={1}
              value={Math.min(nPages, scrollPage + 1)}
              onChange={(e) => scrollRef.current?.scrollTo({ top: (Number(e.target.value) - 1) * pitch })}
              className="h-1 min-w-0 flex-1 cursor-pointer accent-emerald-600"
            />
            <span className="shrink-0 font-bn text-xs tabular-nums opacity-80" aria-live="polite" data-testid="page-indicator">
              পৃষ্ঠা {bnDigits(Math.min(nPages, scrollPage + 1))} / {bnDigits(nPages)}
            </span>
          </div>
        )}
      </footer>

      {/* Resumed banner */}
      <AnimatePresence>
        {ready && resumed && (mode === "page" ? page > 0 : scrollPage > 0) && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-16 left-1/2 z-30 flex w-[min(92vw,380px)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl"
          >
            <p className="flex-1 font-bn">যেখানে থেমেছিলেন, সেখান থেকে খোলা হলো</p>
            <button
              onClick={() => {
                jumpToBlock(-1);
                setResumed(false);
              }}
              className="rounded-lg bg-white/10 px-3 py-1.5 font-bn hover:bg-white/20"
            >
              শুরু থেকে
            </button>
            <button onClick={() => setResumed(false)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOC drawer */}
      <AnimatePresence>
        {tocOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setTocOpen(false)}>
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              role="dialog"
              aria-label="Table of contents"
              className="absolute inset-y-0 right-0 flex w-[min(88vw,400px)] flex-col bg-white text-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <p className="font-bnserif text-lg font-bold">সূচিপত্র</p>
                <button onClick={() => setTocOpen(false)} aria-label="Close contents" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5">
                  <X size={16} />
                </button>
              </div>
              <ol className="flex-1 overflow-y-auto p-2">
                {[{ i: -1, level: "h1", title: "প্রচ্ছদ" }, ...toc].map((c) => {
                  const p = c.i < 0 ? 0 : blockCol[c.i] ?? 0;
                  const active = c.i < 0 ? !chapter : chapter?.i === c.i;
                  return (
                    <li key={c.i}>
                      <button
                        onClick={() => {
                          setTocOpen(false);
                          setResumed(false);
                          setTimeout(() => jumpToBlock(c.i), 120);
                        }}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left font-bn text-sm ${active ? "bg-emerald-50 text-emerald-700" : "hover:bg-black/5"} ${c.level === "h1" ? "font-semibold" : "pl-6"}`}
                      >
                        <span className="flex-1">{c.title}</span>
                        <span className="font-bn text-xs opacity-60">{bnDigits(p + 1)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="border-t border-black/10 p-4 text-[11px] text-slate-500">Swipe or tap the page edges to turn. Keys: ← → to turn, + − for text size, T for contents.</p>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
