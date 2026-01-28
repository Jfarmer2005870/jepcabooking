import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  DollarSign,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Business Analytics",
    description: "Track revenue, compare months & years, and monitor your growth with detailed reports.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Manage bookings, set recurring appointments, and sync with your phone calendar.",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Communicate with customers in real-time. Send photos and get instant answers.",
  },
  {
    icon: FileText,
    title: "Professional Invoices",
    description: "Create branded invoices with e-signatures. Customers can view and pay instantly.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Let field staff clock in/out of jobs. Track hours and location automatically.",
  },
  {
    icon: DollarSign,
    title: "Easy Payments",
    description: "Accept cards, offer payment plans. Get paid faster with secure processing.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Assign jobs, manage crews, and track performance all in one place.",
  },
  {
    icon: TrendingUp,
    title: "Cost Tracking",
    description: "Log expenses, track profits, and import historical data from before Jepca.",
  },
];

const BusinessFeatures = () => {
  return (
    <section id="business" className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <span className="text-sm font-medium text-accent">For Businesses</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-6 leading-tight">
              Grow Your Business with
              <span className="text-gradient-primary"> Powerful Tools</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Everything you need to run your service business. From booking and invoicing
              to analytics and team management—all in one dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="accent" asChild>
                <Link to="/auth">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/services">Browse Services</Link>
              </Button>
            </div>
          </motion.div>

          {/* Right - Features Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                className="p-4 bg-card rounded-xl border border-border/50 shadow-soft hover:shadow-medium transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BusinessFeatures;
