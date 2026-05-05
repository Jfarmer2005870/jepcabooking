import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, CalendarCheck, Sparkles, ChevronRight } from "lucide-react";

const STORAGE_KEY = "jepca_onboarding_seen_v1";

const slides = [
  {
    icon: Search,
    title: "Find a local pro",
    desc: "Browse categories or search for the exact service you need — cleaning, plumbing, lawn, and more.",
  },
  {
    icon: MapPin,
    title: "Set your address",
    desc: "Tell us where the work happens. We use it to match you with nearby pros and calculate travel.",
  },
  {
    icon: CalendarCheck,
    title: "Book a 30-min slot",
    desc: "Pick a day and a 30-minute window between 8am and 6pm. Pay securely in the app.",
  },
  {
    icon: Sparkles,
    title: "Track, chat & review",
    desc: "Message your pro, get notified at every step, and rate them when the job is done.",
  },
];

const OnboardingGuide = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Wait for splash to finish (~1s) before showing
        const t = setTimeout(() => setOpen(true), 1100);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
  };

  const next = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else finish();
  };

  if (!open) return null;
  const Slide = slides[step];
  const Icon = Slide.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Jepca"
      >
        {/* Skip */}
        <div className="flex justify-end p-4">
          <button
            onClick={finish}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center max-w-sm"
            >
              <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-glow-primary mb-8">
                <Icon className="w-11 h-11 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-bold font-display text-foreground mb-3">
                {Slide.title}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {Slide.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 pb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Action */}
        <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <button
            onClick={next}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-glow-primary hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
          >
            {step < slides.length - 1 ? (
              <>Next <ChevronRight className="w-5 h-5" /></>
            ) : (
              "Get started"
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingGuide;
