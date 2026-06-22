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
        <div className="container mx-auto px-4 pt-24 md:pt-28">
          <div className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
            <img
              src="/app-icon.png"
              alt="Jepca app icon preview"
              className="h-20 w-20 rounded-2xl shadow-md"
            />
            <div>
              <p className="text-sm font-semibold">App icon preview</p>
              <p className="text-xs text-muted-foreground">
                How your icon will appear on a home screen.
              </p>
            </div>
          </div>
        </div>
        <HeroSection />
        <ServiceCategories />
        <QuickStart />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
