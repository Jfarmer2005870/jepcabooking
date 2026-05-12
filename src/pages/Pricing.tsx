import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import PricingSection from "@/components/home/PricingSection";
import SEO from "@/components/SEO";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Pricing — Jepca"
        description="Transparent pricing for consumers and service providers. Only a small platform fee per booking — no monthly subscription required."
      />
      <Header />
      <main className="mt-16 md:mt-20">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
