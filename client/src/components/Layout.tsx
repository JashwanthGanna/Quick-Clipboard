import { useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout wrapper providing consistent page structure:
 * Navbar + main content + Footer + CookieConsent.
 * Handles scroll-to-top on route changes.
 */
export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  // Scroll to top on route change (unless it's a hash link)
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Navbar />
      <main className="flex-1" id="main-content" role="main">
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
