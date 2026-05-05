import React, { forwardRef } from "react";
import { Link } from "react-router-dom";

const Footer = forwardRef<HTMLElement>((props, ref) => {
  const footerLinks = {
    product: [
      { label: "Features", href: "/features", isRoute: true },
      { label: "Pricing", href: "/pricing", isRoute: true },
      { label: "Find Services", href: "/services", isRoute: true },
    ],
    company: [
      { label: "About Jepca", href: "/features", isRoute: true },
      { label: "For providers", href: "/auth?mode=signup&role=business", isRoute: true },
      { label: "Trust & safety", href: "/terms", isRoute: true },
      { label: "Press inquiries", href: "mailto:press@jepca.app" },
    ],
    resources: [
      { label: "How it works", href: "/features", isRoute: true },
      { label: "Pricing & fees", href: "/pricing", isRoute: true },
      { label: "Browse services", href: "/services", isRoute: true },
      { label: "Become a provider", href: "/auth?mode=signup&role=business", isRoute: true },
      { label: "Contact support", href: "mailto:support@jepca.app" },
    ],
    legal: [
      { label: "Terms of Service", href: "/terms", isRoute: true },
      { label: "Privacy Policy", href: "/privacy", isRoute: true },
      { label: "Cookie Policy", href: "/cookies", isRoute: true },
    ],
  };

  const renderLink = (link: { label: string; href: string; isRoute?: boolean }) => {
    if (link.isRoute) {
      return (
        <Link
          to={link.href}
          className="text-background/60 hover:text-background transition-colors text-sm"
        >
          {link.label}
        </Link>
      );
    }
    return (
      <a
        href={link.href}
        className="text-background/60 hover:text-background transition-colors text-sm"
      >
        {link.label}
      </a>
    );
  };

  return (
    <footer ref={ref} className="bg-foreground text-background py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-12">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl font-display">J</span>
              </div>
              <span className="text-xl font-bold font-display">Jepca</span>
            </Link>
            <p className="text-background/60 text-sm leading-relaxed">
              Connecting customers with trusted local service professionals.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4 font-display">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 font-display">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 font-display">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 font-display">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-background/60 text-sm">
              © {new Date().getFullYear()} Jepca. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-background/60 hover:text-background transition-colors text-sm" aria-label="Twitter">
                Twitter
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors text-sm" aria-label="LinkedIn">
                LinkedIn
              </a>
              <a href="#" className="text-background/60 hover:text-background transition-colors text-sm" aria-label="Instagram">
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;