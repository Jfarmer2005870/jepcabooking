import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServiceCategories from "@/components/home/ServiceCategories";
import QuickStart from "@/components/home/QuickStart";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <ServiceCategories />
        <QuickStart />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
