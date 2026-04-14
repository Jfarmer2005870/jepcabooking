import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16 max-w-4xl mt-16 md:mt-20">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 14, 2026</p>

        <section className="space-y-6 text-sm md:text-base leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly, such as your name, email address, phone number, and payment details when you create an account, book a service, or communicate through the platform. We also collect usage data automatically, including device information, IP address, browser type, and interaction patterns.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              Your information is used to facilitate bookings, process payments, improve our services, send relevant notifications, and ensure platform safety. We may also use aggregated, anonymized data for analytics and service improvements.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">3. Information Sharing</h2>
            <p className="text-muted-foreground">
              We share your information with service providers you book, payment processors (such as Stripe), and as required by law. We do not sell your personal information to third parties for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures including encryption, secure servers, and access controls to protect your data. However, no method of electronic transmission or storage is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal data. You may also opt out of marketing communications at any time. To exercise these rights, contact us through the platform's support channels.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your personal data for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce agreements.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">7. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Jepca is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the platform with a revised "Last updated" date.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
            <p className="text-muted-foreground">
              For questions or concerns about this Privacy Policy, please contact us through the app's support channels.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
