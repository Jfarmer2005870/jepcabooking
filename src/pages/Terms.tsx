import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 26, 2026</p>

        <section className="space-y-6 text-sm md:text-base leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold mb-2">1. Platform Use</h2>
            <p className="text-muted-foreground">
              Jepca connects consumers with independent local service providers. By using the platform, you agree to use it lawfully and provide accurate account information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">2. Bookings and Payments</h2>
            <p className="text-muted-foreground">
              Booking requests, scheduling, pricing, and payment processing are facilitated through Jepca. Final service performance is the responsibility of the provider.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">3. Cancellations and Disputes</h2>
            <p className="text-muted-foreground">
              Cancellations, refunds, and disputes are handled according to provider policies and applicable platform rules. We may investigate misuse or fraud and take corrective action.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">4. Liability</h2>
            <p className="text-muted-foreground">
              Jepca provides the marketplace infrastructure and is not the direct service provider. To the extent allowed by law, Jepca is not liable for indirect or consequential damages arising from services booked through the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">5. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these terms, please contact support through the app’s contact channels.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
