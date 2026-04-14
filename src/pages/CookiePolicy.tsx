import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16 max-w-4xl mt-16 md:mt-20">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-6">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 14, 2026</p>

        <section className="space-y-6 text-sm md:text-base leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold mb-2">1. What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you interact with the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Cookies</h2>
            <p className="text-muted-foreground mb-3">We use cookies for the following purposes:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
              <li><strong>Essential Cookies:</strong> Required for the platform to function, including authentication and session management.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform so we can improve the experience.</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences, such as language and display options.</li>
              <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and measure campaign effectiveness.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">3. Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              Some cookies are placed by third-party services that appear on our pages, such as payment processors and analytics providers. We do not control the cookies set by third parties.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">4. Managing Cookies</h2>
            <p className="text-muted-foreground">
              You can control and manage cookies through your browser settings. Most browsers allow you to block or delete cookies. However, disabling essential cookies may affect the functionality of the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">5. Cookie Retention</h2>
            <p className="text-muted-foreground">
              Session cookies are deleted when you close your browser. Persistent cookies remain on your device for a set period or until you manually delete them. Analytics cookies are typically retained for up to 12 months.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">6. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie Policy periodically. Changes will be posted on this page with a revised "Last updated" date.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">7. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about our use of cookies, please contact us through the app's support channels.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
