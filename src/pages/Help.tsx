import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import { ONBOARDING_EVENT } from "@/components/OnboardingGuide";

const consumerFaqs = [
  {
    q: "How do I book a service?",
    a: "Browse providers under Find Services, choose a listing, pick a date and 30-minute time slot, confirm your address, and pay securely. The provider is notified instantly and has 24 hours to accept.",
  },
  {
    q: "When am I charged?",
    a: "Your card is authorized when you book. We only capture the payment after the provider accepts. If they decline or don't respond within 24 hours, the hold is released automatically.",
  },
  {
    q: "What is the 5% platform fee?",
    a: "Jepca adds a 5% platform fee to the provider's listed price. It covers secure payments, protection, support, and keeps the marketplace running. The fee is shown clearly before you pay.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Pending bookings can be cancelled for a full refund. After acceptance, each provider sets a cancellation window (default 24 hours). Cancelling inside that window may apply a partial fee — we show the exact refund before you confirm.",
  },
  {
    q: "What if something goes wrong with the job?",
    a: "Open the booking from your dashboard and tap Report an issue. Your provider is notified and can issue a partial or full refund. Most issues are resolved within 48 hours.",
  },
  {
    q: "How do reviews work?",
    a: "After a job is marked complete, you'll get a notification to leave a 1–5 star review. Reviews are public on the provider's profile.",
  },
];

const providerFaqs = [
  {
    q: "How do I get paid?",
    a: "Connect your Stripe account from the dashboard. Payouts land in your bank within Stripe's standard schedule (usually 2 business days after the job completes).",
  },
  {
    q: "Why can't I accept bookings yet?",
    a: "You must finish your Stripe Connect onboarding (charges and payouts both enabled) before accepting bookings. The dashboard shows a yellow banner with a one-click link to complete it.",
  },
  {
    q: "How do I set my hours and service area?",
    a: "Open Account → Operating hours to set weekly availability per weekday. Set your service area, origin address, free travel radius, and per-mile rate in Business profile.",
  },
  {
    q: "Can I send invoices and collect signatures?",
    a: "Yes. Open any accepted booking, add line items and photos, and request a customer signature. Both signatures are saved on the downloadable PDF invoice.",
  },
  {
    q: "What happens if a customer disputes a job?",
    a: "You'll be notified the moment a dispute opens. From the booking, you can issue a partial or full refund directly through Stripe — no need to log in to a separate dashboard.",
  },
];

const Help = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Help & FAQ — Jepca"
        description="Get answers about booking, payments, cancellations, refunds, and provider onboarding on Jepca."
      />
      <Header />
      <main className="flex-1 pt-20 md:pt-24">
        <section className="gradient-hero py-12 md:py-16 border-b border-border">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-3">
              Help Center
            </h1>
            <p className="text-muted-foreground">
              Everything you need to know about booking jobs, getting paid, and using Jepca.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> For customers
              </h2>
              <Accordion type="single" collapsible className="bg-card border border-border rounded-xl px-4">
                {consumerFaqs.map((f, i) => (
                  <AccordionItem key={i} value={`c-${i}`}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            <section>
              <h2 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> For service providers
              </h2>
              <Accordion type="single" collapsible className="bg-card border border-border rounded-xl px-4">
                {providerFaqs.map((f, i) => (
                  <AccordionItem key={i} value={`p-${i}`}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Replay the tour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  See a quick walkthrough of the dashboard tailored to your role.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    window.dispatchEvent(new Event(ONBOARDING_EVENT));
                  }}
                >
                  Start tour
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" /> Still need help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Our team typically replies within one business day.
                </p>
                <Button asChild className="w-full" variant="default">
                  <a href="mailto:support@jepca.app">
                    <Mail className="w-4 h-4 mr-2" /> Email support
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Or browse our{" "}
                  <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
                  {" · "}
                  <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Help;
