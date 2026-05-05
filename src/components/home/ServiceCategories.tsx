import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wrench,
  Droplets,
  Zap,
  TreeDeciduous,
  Sparkles,
  Truck,
  Wind,
  Paintbrush,
  Hammer,
  Bug,
} from "lucide-react";

const categories = [
  { icon: Sparkles, label: "Cleaning", slug: "cleaning" },
  { icon: Droplets, label: "Plumbing", slug: "plumbing" },
  { icon: Zap, label: "Electrical", slug: "electrical" },
  { icon: TreeDeciduous, label: "Lawn", slug: "landscaping" },
  { icon: Paintbrush, label: "Painting", slug: "painting" },
  { icon: Truck, label: "Moving", slug: "moving" },
  { icon: Hammer, label: "Handyman", slug: "handyman" },
  { icon: Wind, label: "HVAC", slug: "hvac" },
  { icon: Bug, label: "Pest", slug: "pest_control" },
  { icon: Wrench, label: "More", slug: "other" },
];

const tileClass = "w-16 h-16 rounded-2xl bg-secondary text-primary flex items-center justify-center";

const ServiceCategories = () => {
  return (
    <section id="services" className="py-6 md:py-10 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">
            Browse categories
          </h2>
          <Link to="/services" className="text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>

        {/* Mobile: horizontal scroll. Desktop: grid */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 w-max pb-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/services?category=${c.slug}`}
                className="flex flex-col items-center gap-2 w-20"
              >
                <div className={`w-16 h-16 rounded-2xl ${c.tint} flex items-center justify-center`}>
                  <c.icon className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">
                  {c.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-5 lg:grid-cols-10 gap-4">
          {categories.map((c, index) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <Link
                to={`/services?category=${c.slug}`}
                className="group flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-secondary transition-colors"
              >
                <div className={`w-16 h-16 rounded-2xl ${c.tint} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <c.icon className="w-7 h-7" />
                </div>
                <span className="text-sm font-medium text-foreground text-center">
                  {c.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;
