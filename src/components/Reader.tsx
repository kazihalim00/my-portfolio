"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, List, Maximize, Minus, Plus, Share2, Type, X } from "lucide-react";
import { penName, type Book } from "@/lib/books";
import { load, save, useApp } from "./Providers";

/* ------------------------------------------------------------------ */
/* Book text: blocks extracted from the PDF (scripts/book-text).        */
/* run = [text, flags]  flags: 1 = bold, 2 = emphasis                   */
/* ------------------------------------------------------------------ */
type Run = [string, number];
type BlockType = "h1" | "h2" | "h3" | "p" | "li" | "quote" | "note" | "right" | "front" | "front-h1" | "front-h2";
type Block = { type: BlockType; label?: string; runs: Run[] };

type Theme = "light" | "sepia" | "dark";
const THEMES: Record<Theme, { label: string; bg: string; paper: string; ink: string; muted: string; accent: string; chrome: string }> = {
  light: { label: "Light", bg: "#e7e4dd", paper: "#fffdf8", ink: "#22201c", muted: "#6b6458", accent: "#0f766e", chrome: "light" },
  sepia: { label: "Sepia", bg: "#ddcfb3", paper: "#f6ecd6", ink: "#3a2e20", muted: "#7a6a52", accent: "#8a4b1a", chrome: "light" },
  dark: { label: "Night", bg: "#0c0e12", paper: "#1a1d23", ink: "#dcd6c8", muted: "#9a9384", accent: "#7cc4b5", chrome: "dark" },
};

const bnDigits = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
const plain = (b: Block) => b.runs.map((r) => r[0]).join("");

type SavedPos = { b: number; pct: number };

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map(([t, f], i) =>
        f & 1 ? (
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

function BlockView({ b, i, prev }: { b: Block; i: number; prev?: Block }) {
  const common = { "data-b": i } as Record<string, number>;
  switch (b.type) {
    case "h1":
      return (
        <h2 {...common} className="bk-h1">
          <Runs runs={b.runs} />
          <span className="bk-orn" aria-hidden>
            ❖
          </span>
        </h2>
      );
    case "h2":
      return (
        <h3 {...common} className={`bk-h2 ${prev?.type === "h1" ? "bk-nobreak" : ""}`}>
          {b.label && <span className="bk-label">{b.label}</span>}
          <span className="block">
            <Runs runs={b.runs} />
          </span>
          <span className="bk-rule" aria-hidden />
        </h3>
      );
    case "h3":
      return (
        <h4 {...common} className="bk-h3">
          <Runs runs={b.runs} />
        </h4>
      );
    case "li":
      return (
        <p {...common} className="bk-li">
          <Runs runs={b.runs} />
        </p>
      );
    case "quote":
      return (
        <blockquote {...common} className={prev && (prev.type === "h2" || prev.type === "h1") ? "bk-epigraph" : "bk-quote"}>
          <Runs runs={b.runs} />
        </blockquote>
      );
    case "note":
      return (
        <p {...common} className="bk-note">
          <Runs runs={b.runs} />
        </p>
      );
    case "right":
      return (
        <p {...common} className="bk-right">
          <Runs runs={b.runs} />
        </p>
      );
    case "front":
      return (
        <p {...common} className="bk-front">
          <Runs runs={b.runs} />
        </p>
      );
    default:
      return (
        <p {...common} className={prev && /^h/.test(prev.type) ? "bk-p bk-first" : "bk-p"}>
          <Runs runs={b.runs} />
        </p>
      );
  }
}

export function Reader({ book }: { book: Book }) {
  const { unlock, toast } = useApp();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [error, setError] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSize] = useState(18);
  const [dims, setDims] = useState({ W: 0, H: 0 });
  const [page, setPage] = useState(0);
  const [nPages, setNPages] = useState(1);
  const [blockCol, setBlockCol] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resumed, setResumed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef(-1); // -1 = the cover
  const pointer = useRef<{ x: number; y: number; t: number } | null>(null);

  // Drop the PDF's own front matter title (we draw a proper title page) and keep the rest.
  const body = useMemo(() => (blocks ?? []).filter((b) => b.type !== "front-h1" && b.type !== "front-h2"), [blocks]);
  const firstFront = body.findIndex((b) => b.type === "front");
  const lastFront = body.length - 1 - [...body].reverse().findIndex((b) => b.type === "front");

  /* ---------- load text + preferences ---------- */
  useEffect(() => {
    unlock("reader");
    setTheme(load<Theme>("reader:theme", "light"));
    setFontSize(load<number>("reader:font", 18));
    const saved = load<SavedPos | null>(`readpos:${book.slug}`, null);
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
  }, []);

  /* ---------- page geometry ---------- */
  const { W, H } = dims;
  const small = W < 640;
  const cols = W >= 1000 && H >= 460 ? 2 : 1;
  const m = small ? 8 : 24;
  const vm = small ? 8 : 18;
  const paperH = Math.max(320, H - 2 * vm);
  const pageW = Math.floor(cols === 2 ? Math.min(540, (W - 2 * m) / 2, paperH / 1.32) : Math.min(660, W - 2 * m, small ? 9999 : paperH / 1.25));
  const px = small ? 22 : cols === 2 ? 44 : 52;
  const pt = small ? 34 : 50;
  const pb = small ? 38 : 50;
  const colW = Math.max(120, pageW - 2 * px);
  const gap = 2 * px;
  const stride = colW + gap;
  const contentH = Math.max(160, paperH - pt - pb);

  /* ---------- paginate ---------- */
  const relayout = useCallback(() => {
    const el = contentRef.current;
    if (!el || !blocks) return;
    const n = Math.max(1, Math.round((el.scrollWidth + gap) / stride));
    const cr = el.getBoundingClientRect();
    const cols_: number[] = [];
    el.querySelectorAll<HTMLElement>("[data-b]").forEach((node) => {
      const r = node.getClientRects()[0];
      if (!r) return;
      cols_[Number(node.dataset.b)] = Math.max(0, Math.floor((r.left - cr.left + 4) / stride));
    });
    setNPages(n);
    setBlockCol(cols_);
    const a = anchorRef.current < 0 ? 0 : cols_[anchorRef.current] ?? 0;
    const p = Math.min(Math.floor(a / cols) * cols, Math.max(0, Math.floor((n - 1) / cols) * cols));
    setAnimate(false);
    setPage(p);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, gap, stride, cols]);

  useLayoutEffect(() => {
    if (!blocks || !W) return;
    let raf = requestAnimationFrame(() => relayout());
    document.fonts?.ready.then(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => relayout());
    });
    return () => cancelAnimationFrame(raf);
  }, [blocks, W, H, fontSize, cols, relayout]);

  /* ---------- turning pages ---------- */
  const lastPageStart = Math.max(0, Math.floor((nPages - 1) / cols) * cols);
  const goTo = useCallback(
    (p: number) => {
      const target = Math.max(0, Math.min(lastPageStart, Math.floor(p / cols) * cols));
      setAnimate(true);
      setPage(target);
      // anchor = the block that is showing at the top of this page
      let a = -1;
      for (let i = 0; i < blockCol.length; i++) if ((blockCol[i] ?? 0) <= target) a = i;
      anchorRef.current = a;
      const pct = Math.min(100, Math.round(((target + cols) / nPages) * 100));
      save(`readpos:${book.slug}`, { b: a, pct });
    },
    [blockCol, book.slug, cols, lastPageStart, nPages]
  );
  const next = useCallback(() => goTo(page + cols), [goTo, page, cols]);
  const prev = useCallback(() => goTo(page - cols), [goTo, page, cols]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") goTo(0);
      else if (e.key === "End") goTo(nPages);
      else if (e.key === "+" || e.key === "=") changeFont(1);
      else if (e.key === "-") changeFont(-1);
      else if (e.key.toLowerCase() === "t") setTocOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, prev, goTo, nPages]);

  const changeFont = (d: number) =>
    setFontSize((f) => {
      const v = Math.max(14, Math.min(26, f + d));
      save("reader:font", v);
      return v;
    });
  const changeTheme = (t: Theme) => {
    setTheme(t);
    save("reader:theme", t);
  };

  const share = async () => {
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
  };

  /* ---------- contents ---------- */
  const toc = useMemo(
    () =>
      body
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.type === "h1" || b.type === "h2")
        .map(({ b, i }) => ({ i, level: b.type, title: b.label ? `${b.label}: ${plain(b)}` : plain(b) })),
    [body]
  );
  const chapterAt = (p: number) => [...toc].reverse().find((c) => (blockCol[c.i] ?? Infinity) <= p);
  const chapter = chapterAt(page);
  const firstTextCol = useMemo(() => {
    const i = body.findIndex((b) => b.type !== "front");
    return i < 0 ? 2 : blockCol[i] ?? 2;
  }, [body, blockCol]);
  const openingCols = useMemo(() => new Set(toc.map((c) => blockCol[c.i])), [toc, blockCol]);

  const T = THEMES[theme];
  const dark = T.chrome === "dark";
  const bar = dark ? "border-white/10 bg-[#11141b]/95 text-slate-200" : "border-black/10 bg-white/90 text-slate-800";
  const pageLabel = (p: number) => bnDigits(p + 1);
  const shownTo = Math.min(nPages, page + cols);

  /* ---------- gestures ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = pointer.current;
    pointer.current = null;
    if (!s) return;
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
    "--bk-colh": `${contentH}px`,
  } as React.CSSProperties;

  return (
    <div className="flex h-[100svh] flex-col overflow-hidden" style={{ background: T.bg }}>
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
                  className={`absolute right-0 top-11 w-60 rounded-xl border p-3 shadow-xl ${dark ? "border-white/10 bg-[#1a1d24]" : "border-black/10 bg-white"}`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider opacity-60">Text size</p>
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
          <button onClick={share} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5" aria-label="Share">
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
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(shownTo / nPages) * 100}%` }} />
        </div>
      </header>

      {/* Book */}
      <div
        ref={stageRef}
        className="relative flex flex-1 touch-pan-y select-text items-center justify-center overflow-hidden"
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

        {blocks && W > 0 && (
          <div
            className="bk-paper relative overflow-hidden rounded-[3px]"
            data-reader-ready={ready ? "true" : undefined}
            data-page={page + 1}
            style={{
              ...cssVars,
              width: pageW * cols,
              height: paperH,
              background: T.paper,
              color: T.ink,
              boxShadow: dark ? "0 10px 40px rgba(0,0,0,.6)" : "0 2px 6px rgba(0,0,0,.08), 0 18px 50px rgba(60,40,10,.18)",
            }}
          >
            {/* running heads */}
            {Array.from({ length: cols }, (_, k) => {
              const p = page + k;
              if (p < firstTextCol || p >= nPages || openingCols.has(p)) return null;
              const head = cols === 2 && k === 0 ? book.title : chapterAt(p)?.title ?? book.title;
              return (
                <div key={`h${k}`} className="pointer-events-none absolute truncate text-center font-bn text-[11px] tracking-wide" style={{ left: k * pageW + px, width: colW, top: small ? 12 : 20, color: T.muted }}>
                  {head}
                </div>
              );
            })}

            {/* text flows through columns; we slide one page (or spread) at a time */}
            <div className="absolute overflow-visible" style={{ left: px, top: pt, width: cols * colW + (cols - 1) * gap, height: contentH }}>
              <div
                ref={contentRef}
                className="bk-content"
                style={{
                  columnCount: cols,
                  columnGap: gap,
                  columnFill: "auto",
                  width: cols * colW + (cols - 1) * gap,
                  height: contentH,
                  transform: `translateX(${-page * stride}px)`,
                  transition: animate ? "transform .5s cubic-bezier(.22,.7,.2,1)" : "none",
                }}
              >
                {/* cover */}
                <figure className="bk-cover" style={{ height: contentH }}>
                  {book.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover} alt={`${book.title} cover`} />
                  )}
                </figure>
                {/* title page */}
                <section className="bk-title" style={{ height: contentH }}>
                  <p className="bk-title-main">{book.title}</p>
                  <p className="bk-title-sub">{book.tagline}</p>
                  <span className="bk-orn" aria-hidden>
                    ❖
                  </span>
                  <p className="bk-title-author">{penName}</p>
                </section>
                {body.map((b, i) => {
                  const node = <BlockView key={i} b={b} i={i} prev={body[i - 1]} />;
                  if (i === firstFront)
                    return (
                      <div key={`f${i}`} className="bk-frontmatter">
                        {body.slice(firstFront, lastFront + 1).map((fb, j) => (
                          <BlockView key={firstFront + j} b={fb} i={firstFront + j} />
                        ))}
                      </div>
                    );
                  if (firstFront >= 0 && i > firstFront && i <= lastFront) return null;
                  return node;
                })}
                {/* end page */}
                <section className="bk-end">
                  <span className="bk-orn" aria-hidden>
                    ❖
                  </span>
                  <p className="bk-end-title">পড়ার জন্য ধন্যবাদ</p>
                  <p className="bk-end-text">ভালো লাগলে বন্ধুদের সাথে শেয়ার করুন, আর গেস্টবুকে আপনার মতামত লিখে যান।</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button onClick={share} className="rounded-lg bg-emerald-600 px-4 py-2 font-sans text-sm font-medium text-white">
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
              </div>
            </div>

            {/* spine for the two-page spread */}
            {cols === 2 && (
              <div
                className="pointer-events-none absolute inset-y-0"
                style={{
                  left: pageW - 40,
                  width: 80,
                  background: dark
                    ? "linear-gradient(to right, transparent, rgba(0,0,0,.35) 48%, rgba(0,0,0,.55) 50%, rgba(0,0,0,.35) 52%, transparent)"
                    : "linear-gradient(to right, transparent, rgba(80,60,30,.07) 44%, rgba(80,60,30,.2) 50%, rgba(80,60,30,.07) 56%, transparent)",
                }}
              />
            )}

            {/* page numbers */}
            {Array.from({ length: cols }, (_, k) => {
              const p = page + k;
              if (p === 0 || p >= nPages) return null;
              return (
                <div key={`n${k}`} className="pointer-events-none absolute text-center font-bn text-xs" style={{ left: k * pageW, width: pageW, bottom: small ? 12 : 18, color: T.muted }}>
                  {pageLabel(p)}
                </div>
              );
            })}
          </div>
        )}

        {/* edge arrows on larger screens */}
        {ready && !small && (
          <>
            <button onClick={prev} disabled={page <= 0} aria-label="Previous page" className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full opacity-50 transition hover:bg-black/10 hover:opacity-100 disabled:hidden md:grid" style={{ color: T.ink }}>
              <ChevronLeft size={26} />
            </button>
            <button onClick={next} disabled={page >= lastPageStart} aria-label="Next page" className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full opacity-50 transition hover:bg-black/10 hover:opacity-100 disabled:hidden md:grid" style={{ color: T.ink }}>
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <footer className={`z-20 border-t ${bar} backdrop-blur`}>
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
      </footer>

      {/* Resumed banner */}
      <AnimatePresence>
        {ready && resumed && page > 0 && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-16 left-1/2 z-30 flex w-[min(92vw,380px)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl"
          >
            <p className="flex-1 font-bn">যেখানে থেমেছিলেন, সেখান থেকে খোলা হলো</p>
            <button
              onClick={() => {
                goTo(0);
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
                          setTimeout(() => goTo(p), 120);
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
