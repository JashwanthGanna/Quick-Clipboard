import { Link } from "wouter";
import { Bolt, Twitter, Github, Linkedin, Heart } from "lucide-react";
import { navigation } from "@/data/navigation";
import { trustBadges } from "@/data/features";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-950 border-t border-white/10" role="contentinfo">
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {trustBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center text-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all duration-300"
                >
                  <Icon className="w-5 h-5 text-purple-400 mb-2" />
                  <span className="text-sm font-semibold text-white">{badge.label}</span>
                  <span className="text-xs text-slate-400">{badge.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="flex items-center gap-3 mb-4 group" aria-label="Quick Clipboard Home">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-slate-900 px-2.5 py-1.5 rounded-lg">
                  <Bolt className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Quick Clipboard
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Fast, secure, and free online clipboard. Share text instantly with a unique 6-digit code. No login required.
            </p>
            <div className="flex items-center gap-3">
              {navigation.social.map((social) => {
                const icons: Record<string, typeof Twitter> = {
                  twitter: Twitter,
                  github: Github,
                  linkedin: Linkedin,
                };
                const SocialIcon = icons[social.icon] || Twitter;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 transition-all duration-300"
                    aria-label={`Follow us on ${social.label}`}
                  >
                    <SocialIcon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3" role="list">
              {navigation.footer.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-purple-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3" role="list">
              {navigation.footer.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-purple-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-3" role="list">
              {navigation.footer.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-purple-400 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {currentYear} Quick Clipboard. All rights reserved.
            </p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              Made with <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> for productivity
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
