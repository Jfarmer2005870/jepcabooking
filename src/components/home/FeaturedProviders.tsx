import { motion } from "framer-motion";
import { Star, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const providers = [
  {
    name: "Martinez Plumbing Co.",
    category: "Plumbing",
    rating: 4.9,
    reviews: 234,
    location: "Houston, TX",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop",
    verified: true,
    responseTime: "< 1 hour",
  },
  {
    name: "Green Thumb Landscaping",
    category: "Landscaping",
    rating: 4.8,
    reviews: 189,
    location: "Austin, TX",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    verified: true,
    responseTime: "< 2 hours",
  },
  {
    name: "Bright Spark Electric",
    category: "Electrical",
    rating: 5.0,
    reviews: 156,
    location: "Dallas, TX",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop",
    verified: true,
    responseTime: "< 30 mins",
  },
  {
    name: "Crystal Clean Services",
    category: "Cleaning",
    rating: 4.9,
    reviews: 412,
    location: "San Antonio, TX",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop",
    verified: true,
    responseTime: "< 1 hour",
  },
];

const FeaturedProviders = () => {
  return (
    <section className="py-20 md:py-32 gradient-hero">
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
            Top-Rated Professionals
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover highly rated service providers trusted by your community
          </p>
        </motion.div>

        {/* Providers Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {providers.map((provider, index) => (
            <motion.div
              key={provider.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden group hover:shadow-medium transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={provider.image}
                  alt={provider.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 text-xs font-medium bg-card/90 backdrop-blur-sm rounded-full text-foreground">
                    {provider.category}
                  </span>
                </div>
                {provider.verified && (
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-lg text-foreground mb-2 font-display">
                  {provider.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">{provider.rating}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    ({provider.reviews} reviews)
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                  <MapPin className="w-3 h-3" />
                  {provider.location}
                </div>

                {/* Response Time */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Responds {provider.responseTime}
                  </span>
                  <Button size="sm" variant="outline">
                    View Profile
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button size="lg" variant="default">
            Browse All Providers
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProviders;
