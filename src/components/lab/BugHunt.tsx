"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bug, Crosshair, Lightbulb, RotateCcw, ShoppingCart, Timer, Trash, Flag } from "lucide-react";
import { BUGS, HINT_COST, type BugId } from "@/lib/bugs";
import { useLab } from "./LabState";
import { Leaderboard } from "./Leaderboard";

type Item = { id: number; name: string; price: number; qty: number; emoji: string };
const START_ITEMS: Item[] = [
  { id: 1, name: "Wireless Mouse", price: 19.99, qty: 1, emoji: "🖱️" },
  { id: 2, name: "Mechanical Keyboard", price: 49.5, qty: 1, emoji: "⌨️" },
  { id: 3, name: "USB-C Hub", price: 24.0, qty: 1, emoji: "🔌" },
];
const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sevColor: Record<string, string> = {
  Critical: "bg-fail/15 text-fail",
  High: "bg-warn/15 text-warn",
  Medium: "bg-brand2/15 text-brand2",
  Low: "bg-fg/10 text-muted",
};

/* ---------------- The intentionally buggy shop ---------------- */
function ShopLite({ reportMode }: { reportMode: boolean }) {
  const lab = useLab();
  const [items, setItems] = useState<Item[]>(START_ITEMS);
  const [code, setCode] = useState("");
  const [couponCount, setCouponCount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [processing, setProcessing] = useState(false);
  const [orders, setOrders] = useState<number[]>([]);
  const processingRef = useRef(false);
  const lastSubmitRef = useRef(0);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = subtotal * 0.1 * couponCount; // BUG: stacks
  const shipping = items.length ? 5 : 0; // BUG: ignores free-shipping promise
  const total = subtotal - discount + shipping;

  const setQty = (id: number, raw: string) => {
    lab.start();
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    if (n < 0) lab.find("negQty"); // BUG: no min validation
    setItems((list) => list.map((i) => (i.id === id ? { ...i, qty: n } : i)));
  };

  const remove = (index: number) => {
    lab.start();
    if (index > 0) lab.find("removeWrong");
    setItems((list) => list.slice(1)); // BUG: always removes the first item
  };

  const applyCoupon = () => {
    lab.start();
    if (code.trim().toUpperCase() !== "SAVE10") {
      setCouponMsg({ ok: false, text: "Invalid coupon code" });
      return;
    }
    setCouponCount((c) => {
      if (c + 1 >= 2) lab.find("coupon");
      return c + 1;
    });
    setCouponMsg({ ok: true, text: "SAVE10 applied: 10% off" });
  };

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    lab.start();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required"; // BUG: format never checked
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!EMAIL_RE.test(email.trim())) lab.find("email");
    // BUG: button never disabled, so a quick second click creates a duplicate order
    if (processingRef.current || Date.now() - lastSubmitRef.current < 3000) lab.find("doubleSubmit");
    lastSubmitRef.current = Date.now();
    processingRef.current = true;
    setProcessing(true);
    const orderNo = 1040 + Math.floor(Math.random() * 900);
    setTimeout(() => {
      setOrders((o) => [...o, orderNo]);
      processingRef.current = false;
      setProcessing(false);
    }, 1400);
  };

  const resetShop = () => {
    setItems(START_ITEMS);
    setCode("");
    setCouponCount(0);
    setCouponMsg(null);
    setName("");
    setEmail("");
    setErrors({});
    setOrders([]);
  };

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-3 rounded-t-xl bg-gradient-to-r from-brand/15 to-brand2/15 px-4 py-3">
        <p className="flex items-center gap-2 font-display font-semibold">
          <ShoppingCart size={16} /> ShopLite
        </p>
        <p className="text-xs text-muted">
          🎉 Free shipping over $50 · code <span className="font-mono font-semibold text-fg">SAVE10</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Cart ({items.length})</p>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((it, idx) => {
                const centsBug = Math.floor(it.price) !== it.price;
                return (
                  <motion.li
                    key={it.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 rounded-xl border border-line/10 bg-surface/60 p-2.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fg/5 text-lg">{it.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{it.name}</p>
                      <p className="text-xs text-muted">{money(it.price)} each</p>
                    </div>
                    <label className="sr-only" htmlFor={`qty-${it.id}`}>
                      Quantity for {it.name}
                    </label>
                    <input
                      id={`qty-${it.id}`}
                      type="number"
                      value={it.qty}
                      onChange={(e) => setQty(it.id, e.target.value)}
                      className="w-14 rounded-lg border border-line/15 bg-bg px-2 py-1 text-center font-mono text-xs outline-none focus:border-brand"
                    />
                    <span className="w-16 text-right font-mono text-xs" data-bug={centsBug ? "cents" : undefined}>
                      {money(Math.floor(it.price) * it.qty)}
                    </span>
                    <button onClick={() => remove(idx)} aria-label={`Remove ${it.name}`} className="rounded-lg p-1.5 text-muted transition hover:bg-fail/10 hover:text-fail">
                      <Trash size={14} />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {items.length === 0 && <li className="rounded-xl border border-dashed border-line/15 p-4 text-center text-xs text-muted">Cart is empty</li>}
          </ul>

          <div className="mt-4 flex gap-2">
            <label htmlFor="coupon" className="sr-only">
              Coupon code
            </label>
            <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="input py-2" />
            <button type="button" onClick={applyCoupon} className="btn-ghost shrink-0 px-4 py-2">
              Apply
            </button>
          </div>
          {couponMsg && <p className={`mt-1.5 text-xs ${couponMsg.ok ? "text-pass" : "text-fail"}`}>{couponMsg.text}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line/10 bg-surface/60 p-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Order summary</p>
            <dl className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              {couponCount > 0 && (
                <div className="flex justify-between text-pass">
                  <dt>Discount</dt>
                  <dd>-{money(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between" data-bug={subtotal - discount > 50 ? "shipping" : undefined}>
                <dt className="text-muted">Shipping</dt>
                <dd>{money(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-line/10 pt-1.5 text-sm font-semibold">
                <dt data-bug="typo">Totla</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>
          </div>

          <form onSubmit={placeOrder} noValidate className="space-y-2">
            <div>
              <label htmlFor="shop-name" className="sr-only">
                Full name
              </label>
              <input id="shop-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className="input py-2" />
              {errors.name && <p className="mt-1 text-xs text-fail">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="shop-email" className="sr-only">
                Email
              </label>
              <input id="shop-email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" className="input py-2" />
              {errors.email && <p className="mt-1 text-xs text-fail">{errors.email}</p>}
            </div>
            <button type="submit" className="btn-primary w-full">
              {processing ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Processing…
                </>
              ) : (
                "Place order"
              )}
            </button>
          </form>
          {orders.length > 0 && (
            <p className="rounded-lg bg-pass/10 px-3 py-2 text-xs text-pass">
              {orders.length === 1 ? `Order #${orders[0]} placed!` : `${orders.length} orders placed: ${orders.map((o) => `#${o}`).join(", ")}`}
            </p>
          )}
          <button type="button" onClick={resetShop} className="self-start text-xs text-muted underline-offset-2 hover:text-fg hover:underline">
            Reset shop
          </button>
        </div>
      </div>
      {reportMode && <span className="sr-only">Report mode is on. Click the element you think is buggy.</span>}
    </div>
  );
}

/* ---------------- Bug tracker side panel ---------------- */
function BugTracker() {
  const lab = useLab();
  const [open, setOpen] = useState<BugId | null>(null);
  const [hintShown, setHintShown] = useState<BugId | null>(null);
  const mm = String(Math.floor(lab.seconds / 60)).padStart(2, "0");
  const ss = String(lab.seconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-fg/5 p-2.5">
          <p className="font-display text-xl font-bold">
            {lab.found.length}
            <span className="text-sm text-muted">/{BUGS.length}</span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted">Bugs</p>
        </div>
        <div className="rounded-xl bg-fg/5 p-2.5">
          <p className="font-display text-xl font-bold text-brand">{lab.score}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted">Score</p>
        </div>
        <div className="rounded-xl bg-fg/5 p-2.5">
          <p className="flex items-center justify-center gap-1 font-mono text-xl font-bold">
            <Timer size={14} className="text-muted" />
            {mm}:{ss}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted">Time</p>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-fg/10">
        <motion.div className="h-full bg-gradient-to-r from-brand to-brand2" animate={{ width: `${(lab.found.length / BUGS.length) * 100}%` }} />
      </div>

      <ul className="scrollbar-thin max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {BUGS.map((b, i) => {
          const isFound = lab.found.includes(b.id);
          const isOpen = open === b.id;
          return (
            <li key={b.id} className={`rounded-xl border transition ${isFound ? "border-pass/30 bg-pass/5" : "border-line/10"}`}>
              <button
                onClick={() => isFound && setOpen(isOpen ? null : b.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs ${isFound ? "cursor-pointer" : "cursor-default"}`}
                aria-expanded={isFound ? isOpen : undefined}
              >
                <span className="font-mono text-muted">BUG-{String(i + 1).padStart(2, "0")}</span>
                <span className={`flex-1 truncate ${isFound ? "font-medium" : "text-muted"}`}>{isFound ? b.title : "??? undiscovered"}</span>
                {isFound ? (
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${sevColor[b.severity]}`}>{b.severity}</span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      lab.takeHint(b.id);
                      setHintShown(hintShown === b.id ? null : b.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        lab.takeHint(b.id);
                        setHintShown(hintShown === b.id ? null : b.id);
                      }
                    }}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-warn hover:bg-warn/10"
                    title={lab.hints.includes(b.id) ? "Show hint" : `Hint (−${HINT_COST} pts)`}
                  >
                    <Lightbulb size={11} /> {lab.hints.includes(b.id) ? "hint" : `−${HINT_COST}`}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {!isFound && hintShown === b.id && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-3 pb-2 text-xs text-warn">
                    💡 {b.hint}
                  </motion.p>
                )}
                {isFound && isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-2 border-t border-line/10 px-3 py-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-muted">Steps to reproduce</p>
                        <ol className="ml-4 list-decimal text-muted">
                          {b.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </div>
                      <p>
                        <span className="font-semibold text-pass">Expected:</span> <span className="text-muted">{b.expected}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-fail">Actual:</span> <span className="text-muted">{b.actual}</span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------- Bug Hunt wrapper ---------------- */
export function BugHunt() {
  const lab = useLab();
  const [reportMode, setReportMode] = useState(false);

  const onReportClick = (e: React.MouseEvent) => {
    if (!reportMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-report-toggle]")) return;
    e.preventDefault();
    e.stopPropagation();
    const el = target.closest<HTMLElement>("[data-bug]");
    const id = el?.dataset.bug as BugId | undefined;
    if (id) {
      if (!lab.found.includes(id)) lab.find(id);
    } else {
      lab.falseReport();
    }
    setReportMode(false);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            ShopLite has <span className="font-semibold text-fg">8 planted bugs</span>. Use it like a real user. Some bugs trigger by themselves; for visual ones, turn on Report mode and click the bug.
          </p>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            data-report-toggle
            onClick={() => {
              lab.start();
              setReportMode((v) => !v);
            }}
            className={`btn px-4 py-2 ${reportMode ? "bg-fail text-white shadow-lg shadow-fail/30" : "btn-ghost"}`}
            aria-pressed={reportMode}
          >
            <Crosshair size={15} /> {reportMode ? "Report mode ON: click the bug" : "Report mode"}
          </button>
          <button onClick={lab.reset} className="btn-ghost px-4 py-2">
            <RotateCcw size={15} /> Restart game
          </button>
          {lab.started && !lab.finished && (
            <button onClick={lab.finish} className="btn-ghost px-4 py-2">
              <Flag size={15} /> I&apos;m done
            </button>
          )}
        </div>
        <div
          onClickCapture={onReportClick}
          className={`relative overflow-hidden rounded-xl border bg-bg/60 transition ${
            reportMode ? "cursor-crosshair border-fail/60 ring-4 ring-fail/15 [&_*]:!cursor-crosshair" : "border-line/10"
          }`}
        >
          <ShopLite reportMode={reportMode} />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Bug size={16} className="text-fail" />
          <h3 className="font-display font-semibold">Bug tracker</h3>
        </div>
        <BugTracker />
        <Leaderboard />
      </div>
    </div>
  );
}
