import { Link } from "react-router-dom";
import {
  Sparkles,
  Droplets,
  Zap,
  TreeDeciduous,
  Paintbrush,
  Truck,
  Hammer,
  Wind,
  Bug,
  Wrench,
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

const QuickCategories = () => {
  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
      <div className="flex gap-3 w-max md:w-auto md:grid md:grid-cols-10 pb-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to={`/services?category=${c.slug}`}
            className="flex flex-col items-center gap-2 w-20 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <c.icon className="w-7 h-7" />
            </div>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              {c.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickCategories;
