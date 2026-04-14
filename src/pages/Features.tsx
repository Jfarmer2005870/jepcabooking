import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Search, Calendar, CreditCard, MessageSquare, Star, Bell, Shield, Clock } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Find Local Pros",
    description: "Browse trusted service providers in your area across categories like cleaning, plumbing, electrical, landscaping, and more.",
  },
  {
    icon: Calendar,
    title: "Easy Booking",
    description: "Pick a date, time, and add any notes — then book in just a few clicks. Providers confirm and you're all set.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Pay securely through the platform with Stripe. Support for fixed-price, hourly, and quote-based services.",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat directly with service providers to discuss details, ask questions, or coordinate schedules before and after booking.",
  },
  {
    icon: Star,
    title: "Ratings & Reviews",
    description: "Leave reviews after completed jobs to help others find great providers. Businesses build their reputation through real feedback.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Stay informed with instant notifications for booking updates, new messages, and reviews.",
  },
  {
    icon: Shield,
    title: "Verified Businesses",
    description: "Providers go through a verification process so you can book with confidence.",
  },
  {
    icon: Clock,
    title: "Flexible Pricing",
    description: "Services support fixed, hourly, or quote-based pricing — so you always know what to expect before you book.",
  },
];

const Features = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16 max-w-5xl mt-16 md:mt-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-4">Platform Features</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to find, book, and manage local services — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-glow-primary">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold font-display mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Features;
