import { Search, CalendarCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Search,
    title: "1. Find a pro",
    desc: "Pick a category or search for the service you need.",
  },
  {
    icon: CalendarCheck,
    title: "2. Pick a time",
    desc: "Choose your address and a 30-min slot that works.",
  },
  {
    icon: Sparkles,
    title: "3. Get it done",
    desc: "Pay securely, chat with your pro, leave a review.",
  },
];

const QuickStart = () => {
  return (
    <section className="py-6 md:py-10 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">
            How it works
          </h2>
          <Link to="/services" className="text-sm font-semibold text-primary hover:underline">
            Get started
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((s) => (
            <div
              key={s.title}
              className="flex sm:flex-col items-start gap-3 p-4 rounded-2xl bg-card border border-border"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-0.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickStart;
