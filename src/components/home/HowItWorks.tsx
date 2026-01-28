import { motion } from "framer-motion";
import { Search, Calendar, CreditCard, Star } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search & Compare",
    description: "Browse services, read reviews, and compare quotes from verified professionals.",
  },
  {
    icon: Calendar,
    title: "Book Instantly",
    description: "Pick a time that works for you. Same-day and recurring bookings available.",
  },
  {
    icon: CreditCard,
    title: "Pay Securely",
    description: "Pay through the app. We hold payment until the job is done to your satisfaction.",
  },
  {
    icon: Star,
    title: "Rate & Review",
    description: "Share your experience to help others find great professionals.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-32 gradient-hero">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4">
            How Jepca Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get any job done in four simple steps
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 md:gap-4 relative">
            {/* Connection Line - Desktop */}
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative text-center"
              >
                {/* Step Number */}
                <div className="relative z-10 w-12 h-12 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold font-display text-lg shadow-glow-primary">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-4 bg-card rounded-2xl shadow-soft border border-border/50 flex items-center justify-center">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold font-display text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
