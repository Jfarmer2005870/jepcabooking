import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServiceCategories from "@/components/home/ServiceCategories";
import QuickStart from "@/components/home/QuickStart";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Jepca — Book Trusted Local Service Providers"
        description="Find and book vetted local pros for cleaning, plumbing, electrical, landscaping and more. Instant booking, secure payments, real reviews."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Jepca",
          url: "https://jepcabooking.lovable.app",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://jepcabooking.lovable.app/services?search={query}",
            "query-input": "required name=query",
          },
        }}
      />
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
