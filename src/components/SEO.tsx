import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  jsonLd?: Record<string, any>;
  noIndex?: boolean;
}

const SITE_URL = "https://jepcabooking.lovable.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      const rel = selector.match(/rel="([^"]+)"/)?.[1];
      if (rel) (el as HTMLLinkElement).rel = rel;
    } else {
      el = document.createElement("meta");
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (name) (el as HTMLMetaElement).setAttribute("name", name);
      if (prop) (el as HTMLMetaElement).setAttribute("property", prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const SEO = ({ title, description, canonical, image, jsonLd, noIndex }: SEOProps) => {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    document.title = fullTitle;

    if (description) {
      const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
      setMeta('meta[name="description"]', "content", desc);
      setMeta('meta[property="og:description"]', "content", desc);
      setMeta('meta[name="twitter:description"]', "content", desc);
    }

    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);

    const canonicalUrl = canonical || `${SITE_URL}${window.location.pathname}`;
    setMeta('link[rel="canonical"]', "href", canonicalUrl);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);

    const img = image || DEFAULT_IMAGE;
    setMeta('meta[property="og:image"]', "content", img);
    setMeta('meta[name="twitter:image"]', "content", img);

    setMeta('meta[name="robots"]', "content", noIndex ? "noindex,nofollow" : "index,follow");

    // JSON-LD
    const existing = document.head.querySelector('script[data-seo-jsonld="1"]');
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoJsonld = "1";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, canonical, image, JSON.stringify(jsonLd), noIndex]);

  return null;
};

export default SEO;
