import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, MapPin, ArrowRight } from "lucide-react";
import heroPattern from "@/assets/hero-pattern.jpg";

const HeroSection = () => {
  const popularServices = [
    "Plumbing",
    "HVAC",
    "Landscaping",
    "Cleaning",
    "Electrical",
    "Auto Repair",
  ];

  return (
    <section className="relative min-h-screen pt-20 overflow-hidden">
      {/* Hero Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroPattern} 
          alt="" 
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 gradient-hero" />
      </div>
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full gradient-glass border border-border/50 shadow-soft mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            <span className="text-sm font-medium text-muted-foreground">
              Your local service marketplace
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold font-display text-foreground leading-tight mb-6"
          >
            Book Local Services{" "}
            <span className="text-gradient-primary">In Minutes</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Connect with verified local professionals for any job. From plumbing to landscaping,
            get instant quotes and book with confidence.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="flex flex-col md:flex-row gap-3 p-3 bg-card rounded-2xl shadow-medium border border-border/50">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-secondary/50 rounded-xl">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="What service do you need?"
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 rounded-xl md:w-48">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Location"
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button size="lg" className="md:px-8">
                Search
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Popular Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2"
          >
            <span className="text-sm text-muted-foreground">Popular:</span>
            {popularServices.map((service) => (
              <button
                key={service}
                className="px-3 py-1 text-sm rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                {service}
              </button>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
