import SEOHead from "@/components/SEOHead";

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
      <SEOHead
        title="Terms of Service - Quick Clipboard"
        description="Read Quick Clipboard's Terms of Service. Understand your rights and responsibilities when using our online clipboard service."
        canonical="https://quickclipboard.com/terms"
      />

      <section className="pt-28 lg:pt-36 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">Terms of Service</h1>
          <p className="text-slate-600 dark:text-slate-400">Last updated: August 5, 2026</p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 space-y-6 shadow-xl dark:shadow-none">

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                By accessing and using Quick Clipboard ("the Service"), you accept and agree to be bound by these Terms 
                of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all 
                visitors, users, and others who access or use the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">2. Description of Service</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Quick Clipboard provides a free online clipboard service that allows users to share text content 
                between devices using unique 6-digit codes. The Service includes text sharing, QR code generation, 
                share links, and optional self-destruct functionality.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">3. User Responsibilities</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">By using Quick Clipboard, you agree to:</p>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                <li>Use the Service only for lawful purposes</li>
                <li>Not share content that is illegal, harmful, threatening, abusive, or otherwise objectionable</li>
                <li>Not use the Service to distribute malware, phishing content, or spam</li>
                <li>Not attempt to circumvent any security features of the Service</li>
                <li>Not use automated tools to access the Service in a manner that could damage or overload our servers</li>
                <li>Not use the Service to infringe on the intellectual property rights of others</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">4. Content</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                You retain all rights to the content you share through Quick Clipboard. By using the Service, you 
                grant us a limited, temporary license to store and transmit your content solely for the purpose of 
                providing the clipboard sharing service. All content is automatically deleted after 24 hours or 
                upon first view if Self-Destruct Mode is enabled.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">5. Privacy</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Your use of Quick Clipboard is also governed by our{" "}
                <a href="/privacy" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">Privacy Policy</a>. 
                Please review our Privacy Policy to understand how we collect, use, and protect your information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">6. Intellectual Property</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The Quick Clipboard name, logo, website design, and all related intellectual property are owned by us. 
                You may not reproduce, distribute, or create derivative works from our intellectual property without 
                our prior written consent.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">7. Disclaimer of Warranties</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
                TIMELY, SECURE, OR ERROR-FREE.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">8. Limitation of Liability</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                IN NO EVENT SHALL QUICK CLIPBOARD, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR 
                AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
                INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, 
                RESULTING FROM YOUR USE OF THE SERVICE.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">9. Termination</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We may terminate or suspend your access to the Service immediately, without prior notice or liability, 
                for any reason whatsoever, including without limitation if you breach these Terms of Service. Upon 
                termination, your right to use the Service will cease immediately.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">10. Changes to Terms</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We reserve the right to modify or replace these Terms of Service at any time. We will provide notice 
                of significant changes by posting the new terms on this page. Your continued use of the Service after 
                changes constitutes acceptance of the updated terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">11. Governing Law</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                These Terms shall be governed by and construed in accordance with applicable laws, without regard to 
                conflict of law principles.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">12. Contact</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:legal@quickclipboard.com" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                  legal@quickclipboard.com
                </a>{" "}
                or visit our{" "}
                <a href="/contact" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">Contact page</a>.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
