"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, X } from "lucide-react";

/* ---------- storage helpers (never throw) ---------- */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: ignore */
  }
}

/* ---------- achievements ---------- */
export const ACHIEVEMENTS = {
  explorer: { title: "Explorer", desc: "Scrolled through the whole portfolio" },
  hacker: { title: "Terminal Hacker", desc: "Ran a command in the terminal" },
  firstBug: { title: "First Blood", desc: "Found your first planted bug" },
  bugHunter: { title: "Bug Hunter", desc: "Found all 8 bugs in ShopLite" },
  tester: { title: "CI Watcher", desc: "Ran the Playwright test suite" },
  fixer: { title: "Green Build", desc: "Got every test passing" },
  power: { title: "Power User", desc: "Opened the command palette" },
  signer: { title: "Friendly Visitor", desc: "Signed the guestbook" },
  theme: { title: "Night Owl / Early Bird", desc: "Switched the theme" },
  secret: { title: "Secret Finder", desc: "Discovered a hidden command" },
  reader: { title: "Bookworm", desc: "Opened one of my books" },
} as const;
export type AchievementId = keyof typeof ACHIEVEMENTS;

type Toast = { id: number; title: string; desc: string; tone: "achievement" | "info" | "bug" };

type Ctx = {
  theme: "dark" | "light";
  toggleTheme: () => void;
  unlocked: AchievementId[];
  unlock: (id: AchievementId) => void;
  toast: (t: Omit<Toast, "id">) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  achievementsOpen: boolean;
  setAchievementsOpen: (v: boolean) => void;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside Providers");
  return ctx;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [unlocked, setUnlocked] = useState<AchievementId[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const idRef = useRef(0);
  const unlockedRef = useRef<AchievementId[]>([]);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    const saved = load<AchievementId[]>("achievements", []).filter((a) => a in ACHIEVEMENTS);
    unlockedRef.current = saved;
    setUnlocked(saved);
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const unlock = useCallback(
    (id: AchievementId) => {
      if (unlockedRef.current.includes(id)) return;
      const next = [...unlockedRef.current, id];
      unlockedRef.current = next;
      setUnlocked(next);
      save("achievements", next);
      toast({ title: `Achievement unlocked: ${ACHIEVEMENTS[id].title}`, desc: ACHIEVEMENTS[id].desc, tone: "achievement" });
    },
    [toast]
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("theme", next);
      } catch {}
      return next;
    });
    unlock("theme");
  }, [unlock]);

  // Global Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (paletteOpen) unlock("power");
  }, [paletteOpen, unlock]);

  const value = useMemo(
    () => ({ theme, toggleTheme, unlocked, unlock, toast, paletteOpen, setPaletteOpen, achievementsOpen, setAchievementsOpen }),
    [theme, toggleTheme, unlocked, unlock, toast, paletteOpen, achievementsOpen]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="glass pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5 shadow-2xl"
            >
              <div
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  t.tone === "bug" ? "bg-fail/15 text-fail" : t.tone === "achievement" ? "bg-warn/15 text-warn" : "bg-brand/15 text-brand"
                }`}
              >
                {t.tone === "bug" ? "🐞" : t.tone === "achievement" ? <Trophy size={16} /> : "✓"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-muted">{t.desc}</p>
              </div>
              <button
                aria-label="Dismiss"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-muted hover:text-fg"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
}
