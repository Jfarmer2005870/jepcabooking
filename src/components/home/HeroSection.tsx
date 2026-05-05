import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Clock, ChevronRight } from "lucide-react";
import { useState } from "react";

const quickFilters = [
  { label: "Available now", icon: Clock },
  { label: "Top rated" },
  { label: "Under $50" },
  { label: "Same day" },
  { label: "Verified pros" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (location) params.set("loc", location);
    navigate(`/services${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="relative pt-24 md:pt-28 pb-6 md:pb-10 bg-background">
      <div className="container mx-auto px-4">
        {/* Address pill (app-style) */}
        <button
          onClick={() => navigate("/profile")}
          className="md:hidden flex items-center gap-2 mb-4 text-sm font-semibold text-foreground"
          aria-label="Change delivery address"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className="truncate max-w-[200px]">Set your address</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Headline — compact, app-feel */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl md:text-5xl font-bold font-display leading-tight mb-2"
        >
          What do you need today?
        </motion.h1>
        <p className="text-muted-foreground mb-6 md:mb-8">
          Book a verified local pro in minutes.
        </p>

        {/* Search bar — single rounded input row, like an app search */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-col md:flex-row gap-2 mb-5"
        >
          <div className="flex-1 flex items-center gap-3 px-4 h-14 bg-card rounded-2xl border border-border shadow-soft focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search services or pros"
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="hidden md:flex items-center gap-3 px-4 h-14 bg-card rounded-2xl border border-border shadow-soft md:w-64 focus-within:ring-2 focus-within:ring-primary/30">
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              type="text"
              placeholder="Address or ZIP"
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            className="h-14 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-glow-primary hover:opacity-95 transition-opacity"
          >
            Search
          </button>
        </motion.form>

        {/* Filter chips — horizontally scrollable, app-style */}
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1 w-max">
            {quickFilters.map((f) => (
              <button
                key={f.label}
                className="flex items-center gap-1.5 px-4 h-10 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
              >
                {f.icon ? <f.icon className="w-4 h-4" /> : null}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
