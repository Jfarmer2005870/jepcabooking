import { Percent } from "lucide-react";

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-muted-foreground text-lg mb-12">
          No subscriptions. No hidden fees. Just one simple platform fee.
        </p>

        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-lg">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow-primary">
            <Percent className="w-8 h-8 text-primary-foreground" />
          </div>

          <p className="text-5xl md:text-6xl font-bold font-display text-primary mb-2">5%</p>
          <p className="text-xl font-semibold mb-4">Platform Fee</p>

          <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
            We add a small 5% fee on top of whatever the service provider charges.
            Providers set their own rates — you'll always see the total price
            (including the fee) before you book. That's it.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="font-semibold mb-1">Free for Providers</p>
              <p className="text-muted-foreground">No signup costs or monthly fees for businesses</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="font-semibold mb-1">No Hidden Costs</p>
              <p className="text-muted-foreground">The price you see is the price you pay</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4">
              <p className="font-semibold mb-1">Pay Per Booking</p>
              <p className="text-muted-foreground">Fee only applies when you book a service</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
