import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "cookie-consent-accepted";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] p-4 transition-all duration-500 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-consent-description"
    >
      <div className="max-w-4xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-white">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg shrink-0 hidden sm:block">
            <Cookie className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-slate-900 dark:text-white font-semibold mb-1">🍪 We value your privacy</h3>
            <p id="cookie-consent-description" className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We use essential cookies to ensure Quick Clipboard works properly. We'd also like to use
              analytics cookies to understand how you use our site so we can improve it.{" "}
              <Link href="/privacy" className="text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 font-medium">
                Privacy Policy
              </Link>
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors p-1 shrink-0 sm:hidden"
            aria-label="Close cookie consent banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 sm:ml-14">
          <Button
            onClick={handleAccept}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-sm px-6"
          >
            Accept All
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 text-sm px-6"
          >
            Essential Only
          </Button>
        </div>
      </div>
    </div>
  );
}
