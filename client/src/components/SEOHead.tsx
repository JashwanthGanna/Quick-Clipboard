import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  keywords?: string;
  noIndex?: boolean;
}

/**
 * Manages document head meta tags for SEO.
 * Updates document.title and meta tags via useEffect.
 * Include on every page for proper SEO.
 */
export default function SEOHead({
  title = "Quick Clipboard - Free Online Clipboard | Share Text Instantly",
  description = "Quick Clipboard is a free, fast, and secure online clipboard tool. Share text instantly with a unique 6-digit code. No login required. Works on all devices.",
  canonical,
  ogType = "website",
  ogImage = "https://quickclipboard.com/og-image.png",
  keywords,
  noIndex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Helper to set or create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Primary meta tags
    setMeta("name", "description", description);
    if (keywords) setMeta("name", "keywords", keywords);
    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      setMeta("name", "robots", "index, follow");
    }

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    if (ogImage) setMeta("property", "og:image", ogImage);
    if (canonical) setMeta("property", "og:url", canonical);

    // Twitter Card
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (ogImage) setMeta("name", "twitter:image", ogImage);

    // Canonical link
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }
  }, [title, description, canonical, ogType, ogImage, keywords, noIndex]);

  return null;
}
