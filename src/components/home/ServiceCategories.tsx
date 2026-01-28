import { motion } from "framer-motion";
import {
  Wrench,
  Droplets,
  Zap,
  TreeDeciduous,
  Sparkles,
  Car,
  Home,
  Paintbrush,
} from "lucide-react";

const categories = [
  { icon: Wrench, label: "Repairs", count: "240+ pros", color: "from-blue-500 to-blue-600" },
  { icon: Droplets, label: "Plumbing", count: "180+ pros", color: "from-cyan-500 to-cyan-600" },
  { icon: Zap, label: "Electrical", count: "150+ pros", color: "from-yellow-500 to-orange-500" },
  { icon: TreeDeciduous, label: "Landscaping", count: "200+ pros", color: "from-green-500 to-emerald-600" },
  { icon: Sparkles, label: "Cleaning", count: "320+ pros", color: "from-purple-500 to-purple-600" },
  { icon: Car, label: "Auto Services", count: "190+ pros", color: "from-red-500 to-rose-600" },
  { icon: Home, label: "HVAC", count: "120+ pros", color: "from-teal-500 to-teal-600" },
  { icon: Paintbrush, label: "Painting", count: "170+ pros", color: "from-pink-500 to-pink-600" },
];

const ServiceCategories = () => {
  return (
    <section id="services" className="py-20 md:py-32 bg-background">
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
            Browse by Category
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect professional for any job. All providers are vetted and reviewed.
          </p>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <motion.a
              key={category.label}
              href="#"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              className="group p-6 md:p-8 bg-card rounded-2xl shadow-soft border border-border/50 hover:shadow-medium transition-all duration-300"
            >
              <div
                className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <category.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold font-display text-foreground mb-1">
                {category.label}
              </h3>
              <p className="text-sm text-muted-foreground">{category.count}</p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;
