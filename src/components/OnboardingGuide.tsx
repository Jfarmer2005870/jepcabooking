import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";

const STORAGE_KEY = "jepca_onboarding_seen_v2";

type Step = {
  target?: string; // data-tour attribute value
  title: string;
  desc: string;
  placement?: "top" | "bottom" | "auto";
};

const steps: Step[] = [
  {
    title: "Welcome to Jepca",
    desc: "A quick 4-step tour so you know exactly how to book a local pro.",
  },
  {
    target: "search",
    title: "Search for a service",
    desc: "Type what you need — cleaning, plumbing, lawn care, anything.",
    placement: "bottom",
  },
  {
    target: "address",
    title: "Set your address",
    desc: "We use it to match nearby pros and calculate travel fees.",
    placement: "bottom",
  },
  {
    target: "categories",
    title: "Or browse by category",
    desc: "Tap any category to jump straight to available pros.",
    placement: "top",
  },
  {
    target: "tab-orders",
    title: "Track your bookings",
    desc: "Open Orders any time to see status, chat, and invoices.",
    placement: "top",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;

const getRect = (sel: string): Rect | null => {
  const el = document.querySelector(`[data-tour="${sel}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - PADDING, left: r.left - PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 };
};

const isInViewport = (r: Rect): boolean => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  return r.top >= 0 && r.left >= 0 && r.top + r.height <= vh && r.left + r.width <= vw;
};

const OnboardingGuide = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setOpen(true), 1100);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const current = steps[step];

  useLayoutEffect(() => {
    if (!open) return;
    setReady(false);
    setRect(null);
    setTimedOut(false);

    if (!current.target) {
      setReady(true);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let scrolled = false;
    const start = performance.now();
    const TIMEOUT = 4000;

    const tick = () => {
      if (cancelled) return;
      const r = getRect(current.target!);
      if (r) {
        if (!scrolled) {
          scrolled = true;
          const el = document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null;
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (isInViewport(r)) {
          setRect(r);
          setReady(true);
          return;
        }
      }
      if (performance.now() - start > TIMEOUT) {
        // Timed out — surface Retry UI instead of forcing the tooltip
        setRect(r);
        setTimedOut(true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const sync = () => {
      if (!current.target) return;
      const r = getRect(current.target);
      if (r) setRect(r);
    };
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, step, current.target, retryNonce]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
  };

  const next = () => (step < steps.length - 1 ? setStep(step + 1) : finish());
  const back = () => step > 0 && setStep(step - 1);
  const retry = () => setRetryNonce((n) => n + 1);
  const skipStep = () => next();

  if (!open) return null;

  // Tooltip placement
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const tipWidth = Math.min(340, vw - 24);
  let tipTop = vh / 2 - 80;
  let tipLeft = vw / 2 - tipWidth / 2;

  if (rect) {
    const placement = current.placement === "top"
      ? "top"
      : current.placement === "bottom"
      ? "bottom"
      : rect.top > vh / 2 ? "top" : "bottom";
    if (placement === "bottom") tipTop = Math.min(rect.top + rect.height + 12, vh - 220);
    else tipTop = Math.max(12, rect.top - 200);
    tipLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - tipWidth / 2), vw - tipWidth - 12);
  }

  const overlay = (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="App tour">
      {/* SVG mask creates spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={finish}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={16}
                ry={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(10,20,30,0.65)" mask="url(#tour-mask)" />
      </svg>

      {/* Highlight ring around target */}
      {rect && (
        <motion.div
          layout
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute pointer-events-none rounded-2xl ring-2 ring-primary shadow-glow-primary"
        />
      )}

      {/* Loading indicator while waiting for target to scroll into view */}
      {!ready && !timedOut && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-3 rounded-full bg-card border border-border shadow-strong"
          role="status"
          aria-live="polite"
        >
          <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-foreground">Locating…</span>
        </div>
      )}

      {/* Timed out — Retry / Skip / Close */}
      {!ready && timedOut && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-24px)] bg-card text-card-foreground rounded-2xl shadow-strong border border-border p-5 text-center"
          role="alert"
        >
          <h3 className="text-base font-bold font-display mb-1">Can't find that spot yet</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Try scrolling the page manually until the area you want highlighted is visible on screen, then tap Retry.
          </p>
          <ol className="text-xs text-muted-foreground text-left mb-4 space-y-1 pl-4 list-decimal">
            <li>Close this dialog or scroll behind it.</li>
            <li>Bring the relevant section into view.</li>
            <li>Tap <span className="font-semibold text-foreground">Retry</span> below.</li>
          </ol>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={finish}
              className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
            <button
              onClick={skipStep}
              className="h-9 px-3 rounded-lg text-sm font-medium border border-border hover:bg-secondary"
            >
              Skip step
            </button>
            <button
              onClick={retry}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tooltip card — only when ready */}
      {ready && (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{ top: tipTop, left: tipLeft, width: tipWidth }}
            className="absolute bg-card text-card-foreground rounded-2xl shadow-strong border border-border p-5"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                Step {step + 1} of {steps.length}
              </div>
              <button
                onClick={finish}
                aria-label="Close tour"
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold font-display mb-1">{current.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{current.desc}</p>

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={back}
                    className="h-9 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={!ready}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step < steps.length - 1 ? (<>Next <ChevronRight className="w-4 h-4" /></>) : "Done"}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
};

export default OnboardingGuide;
