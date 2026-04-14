import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServiceCategories from "@/components/home/ServiceCategories";
import HowItWorks from "@/components/home/HowItWorks";
import BusinessFeatures from "@/components/home/BusinessFeatures";

import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <ServiceCategories />
        <HowItWorks />
        <BusinessFeatures />
        <CTASection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
