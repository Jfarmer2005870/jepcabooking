import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import PricingSection from "@/components/home/PricingSection";

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mt-16 md:mt-20">
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
