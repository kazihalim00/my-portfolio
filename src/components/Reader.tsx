"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, List, Maximize, Minus, Plus, Share2, X } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { penName, type Book } from "@/lib/books";
import { load, save, useApp } from "./Providers";

type Theme = "light" | "sepia" | "dark";
const THEMES: { id: Theme; label: string; bg: string; swatch: string }[] = [
  { id: "light", label: "Light", bg: "#e9e7e2", swatch: "#ffffff" },
  { id: "sepia", label: "Sepia", bg: "#e8dcc4", swatch: "#f4ecd8" },
  { id: "dark", label: "Night", bg: "#0b0d12", swatch: "#1c1f26" },
];
const pageFilter: Record<Theme, string> = {
  light: "none",
  sepia: "sepia(0.35) brightness(0.98) contrast(0.95)",
  dark: "invert(0.9) hue-rotate(180deg) brightness(0.95)",
};

function PdfPage({
  doc,
  num,
  width,
  ratio,
  theme,
  onVisible,
}: {
  doc: PDFDocumentProxy;
  num: number;
  width: number;
  ratio: number;
  theme: Theme;
  onVisible: (n: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Render only pages close to the viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "1200px 0px" });
    io.observe(el);
    const io2 = new IntersectionObserver(([e]) => e.isIntersecting && onVisible(num), { rootMargin: "-45% 0px -45% 0px" });
    io2.observe(el);
    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, [num, onVisible]);

  useEffect(() => {
    if (!near || !width) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(num);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      task = page.render({ canvasContext: ctx, viewport });
      try {
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch {
        /* cancelled */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, num, width, near]);

  return (
    <div
      ref={wrapRef}
      id={`page-${num}`}
      data-page={num}
      className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-[0_4px_24px_rgba(0,0,0,.18)]"
      style={{ width, height: width * ratio }}
    >
      {!rendered && (
        <div className="absolute inset-0 grid place-items-center text-sm text-neutral-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        aria-label={`Page ${num}`}
        className="block h-full w-full"
        style={{ filter: num === 1 ? "none" : pageFilter[theme] }}
      />
    </div>
  );
}

export function Reader({ book }: { book: Book }) {
  const { unlock, toast } = useApp();
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [ratio, setRatio] = useState(1.417);
  const [current, setCurrent] = useState(1);
  const [theme, setTheme] = useState<Theme>("light");
  const [zoom, setZoom] = useState(1);
  const [containerW, setContainerW] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [jump, setJump] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const total = doc?.numPages ?? book.pages ?? 0;

  // Load PDF + saved preferences
  useEffect(() => {
    unlock("reader");
    setTheme(load<Theme>("reader:theme", "light"));
    const saved = load<number>(`read:${book.slug}`, 0);
    if (saved > 2) setResumeAt(saved);
    let destroyed = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const d = await pdfjs.getDocument({ url: book.pdf! }).promise;
        if (destroyed) return d.destroy();
        loaded = d;
        const p1 = await d.getPage(2 <= d.numPages ? 2 : 1);
        const vp = p1.getViewport({ scale: 1 });
        setRatio(vp.height / vp.width);
        setDoc(d);
      } catch {
        if (!destroyed) setError(true);
      }
    })();
    return () => {
      destroyed = true;
      loaded?.destroy();
    };
  }, [book.pdf, book.slug, unlock]);

  // Measure available width
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pageW = Math.round(Math.min(containerW - 24, 760) * zoom);

  const onVisible = useCallback(
    (n: number) => {
      setCurrent(n);
      save(`read:${book.slug}`, n);
    },
    [book.slug]
  );

  const goTo = useCallback(
    (n: number) => {
      const target = Math.max(1, Math.min(total || 1, n));
      document.getElementById(`page-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [total]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)));
      else if (e.key === "-") setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)));
      else if (e.key.toLowerCase() === "t") setTocOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

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

  const chapter = [...(book.toc ?? [])].reverse().find((c) => c.page <= current);
  const T = THEMES.find((t) => t.id === theme)!;
  const dark = theme === "dark";

  return (
    <div className="flex h-[100svh] flex-col" style={{ background: T.bg }}>
      {/* Top bar */}
      <header className={`z-20 border-b ${dark ? "border-white/10 bg-[#11141b]/95 text-slate-200" : "border-black/10 bg-white/90 text-slate-800"} backdrop-blur`}>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2">
          <Link href="/#books" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-black/5" aria-label="Back to portfolio">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bnserif text-sm font-semibold">{book.title}</p>
            <p className="truncate font-bn text-[11px] opacity-60">{chapter?.title ?? penName}</p>
          </div>
          <div className="hidden items-center gap-1 rounded-lg border border-current/10 p-0.5 sm:flex" role="radiogroup" aria-label="Reading theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => changeTheme(t.id)}
                title={t.label}
                className={`h-7 w-7 rounded-md border ${theme === t.id ? "ring-2 ring-emerald-500" : "border-black/10"}`}
                style={{ background: t.swatch }}
              >
                <span className="sr-only">{t.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-black/5 sm:grid" aria-label="Zoom out">
            <Minus size={16} />
          </button>
          <span className="hidden w-10 text-center font-mono text-xs sm:block">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="hidden h-9 w-9 place-items-center rounded-lg hover:bg-black/5 sm:grid" aria-label="Zoom in">
            <Plus size={16} />
          </button>
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
          <a href={book.pdf} download className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5" aria-label="Download PDF">
            <Download size={16} />
          </a>
          <button onClick={() => setTocOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700" aria-label="Contents">
            <List size={16} /> <span className="hidden sm:inline">সূচিপত্র</span>
          </button>
        </div>
        <div className="h-0.5 bg-black/5">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: total ? `${(current / total) * 100}%` : 0 }} />
        </div>
      </header>

      {/* Pages */}
      <div ref={scrollerRef} className="relative flex-1 overflow-y-auto overflow-x-auto py-6">
        {error && (
          <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-center text-slate-800 shadow">
            <p className="font-semibold">This browser could not open the reader.</p>
            <a href={book.pdf} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
              <Download size={15} /> Open the PDF instead
            </a>
          </div>
        )}
        {!doc && !error && (
          <div className="grid h-full place-items-center">
            <div className="text-center" style={{ color: dark ? "#cbd5e1" : "#334155" }}>
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="mt-3 font-bn text-sm">বই খোলা হচ্ছে…</p>
            </div>
          </div>
        )}
        {doc && pageW > 0 && (
          <div className="flex flex-col gap-5 px-3">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i + 1} doc={doc} num={i + 1} width={pageW} ratio={ratio} theme={theme} onVisible={onVisible} />
            ))}
            <div className="mx-auto max-w-md py-10 text-center font-bn" style={{ color: dark ? "#cbd5e1" : "#334155" }}>
              <p className="text-lg font-semibold">পড়ার জন্য ধন্যবাদ 🤍</p>
              <p className="mt-1 text-sm opacity-70">ভালো লাগলে বন্ধুদের সাথে শেয়ার করুন, আর গেস্টবুকে আপনার মতামত লিখে যান।</p>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={share} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
                  Share
                </button>
                <Link href="/#guestbook" className="rounded-lg border border-current/20 px-4 py-2 text-sm font-medium">
                  Guestbook
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <footer className={`z-20 border-t ${dark ? "border-white/10 bg-[#11141b]/95 text-slate-200" : "border-black/10 bg-white/90 text-slate-800"} backdrop-blur`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2">
          <button onClick={() => goTo(current - 1)} disabled={current <= 1} className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm hover:bg-black/5 disabled:opacity-30" aria-label="Previous page">
            <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(jump, 10);
              if (!Number.isNaN(n)) goTo(n);
              setJump("");
            }}
            className="flex items-center gap-1.5 text-sm"
          >
            <label htmlFor="jump" className="sr-only">
              Go to page
            </label>
            <input
              id="jump"
              inputMode="numeric"
              value={jump}
              onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
              placeholder={String(current)}
              className="w-12 rounded-md border border-current/20 bg-transparent px-1.5 py-1 text-center font-mono text-sm outline-none focus:border-emerald-500"
            />
            <span className="font-mono opacity-70">/ {total}</span>
          </form>
          <div className="flex items-center gap-1 sm:hidden" role="radiogroup" aria-label="Reading theme (mobile)">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => changeTheme(t.id)}
                className={`h-6 w-6 rounded-full border ${theme === t.id ? "ring-2 ring-emerald-500" : "border-black/20"}`}
                style={{ background: t.swatch }}
              >
                <span className="sr-only">{t.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => goTo(current + 1)} disabled={current >= total} className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm hover:bg-black/5 disabled:opacity-30" aria-label="Next page">
            <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
          </button>
        </div>
      </footer>

      {/* Resume banner */}
      <AnimatePresence>
        {doc && resumeAt > 2 && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-20 left-1/2 z-30 flex w-[min(92vw,380px)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl"
          >
            <p className="flex-1 font-bn">আগেরবার {resumeAt} নম্বর পৃষ্ঠায় ছিলেন</p>
            <button
              onClick={() => {
                goTo(resumeAt);
                setResumeAt(0);
              }}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-slate-950"
            >
              Continue
            </button>
            <button onClick={() => setResumeAt(0)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
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
              className="absolute inset-y-0 right-0 flex w-[min(88vw,380px)] flex-col bg-white text-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <p className="font-bnserif text-lg font-bold">সূচিপত্র</p>
                <button onClick={() => setTocOpen(false)} aria-label="Close contents" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5">
                  <X size={16} />
                </button>
              </div>
              <ol className="flex-1 overflow-y-auto p-2">
                {(book.toc ?? []).map((c) => {
                  const active = chapter?.page === c.page;
                  return (
                    <li key={c.page + c.title}>
                      <button
                        onClick={() => {
                          setTocOpen(false);
                          setTimeout(() => goTo(c.page), 150);
                        }}
                        className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left font-bn text-sm ${active ? "bg-emerald-50 text-emerald-700" : "hover:bg-black/5"}`}
                      >
                        <span className="flex-1">{c.title}</span>
                        <span className="font-mono text-xs opacity-60">{c.page}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="border-t border-black/10 p-4 text-[11px] text-slate-500">Tips: ← → to turn pages, + − to zoom, T for contents.</p>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
