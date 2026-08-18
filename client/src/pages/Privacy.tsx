import SEOHead from "@/components/SEOHead";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
      <SEOHead
        title="Privacy Policy - Quick Clipboard"
        description="Read Quick Clipboard's privacy policy. Learn how we handle your data, what we collect, and how we protect your privacy."
        canonical="https://quickclipboard.com/privacy"
        noIndex={false}
      />

      <section className="pt-28 lg:pt-36 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-600 dark:text-slate-400">Last updated: August 5, 2026</p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">

            <div className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 space-y-6 shadow-xl dark:shadow-none">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">1. Introduction</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Welcome to Quick Clipboard ("we," "our," or "us"). We are committed to protecting your privacy and ensuring 
                  that your personal information is handled responsibly. This Privacy Policy explains how we collect, use, 
                  disclose, and safeguard your information when you use our online clipboard service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">2. Information We Collect</h2>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">2.1 Clipboard Content</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  When you use Quick Clipboard, we temporarily store the text content you submit. This content is:
                </p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                  <li>Automatically deleted after 24 hours</li>
                  <li>Immediately deleted after first view if Self-Destruct Mode is enabled</li>
                  <li>Encrypted during transmission using SSL/TLS</li>
                  <li>Not indexed, searched, or analyzed by us</li>
                </ul>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 mt-4">2.2 Automatically Collected Information</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We may automatically collect certain information when you visit our website, including your IP address, 
                  browser type, operating system, referring URLs, and access times. This information is used solely for 
                  analytics and improving our service.
                </p>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 mt-4">2.3 Cookies</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We use essential cookies to ensure the website functions properly. We may also use analytics cookies 
                  (such as Google Analytics) to understand how visitors interact with our site. You can control cookie 
                  preferences through our cookie consent banner.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">3. How We Use Your Information</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">We use the information we collect to:</p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                  <li>Provide and maintain the clipboard sharing service</li>
                  <li>Improve and optimize our website performance</li>
                  <li>Monitor usage patterns and detect abuse</li>
                  <li>Respond to your inquiries and support requests</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">4. Data Sharing and Disclosure</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We do not sell, trade, or rent your personal information to third parties. We may share information 
                  only in the following circumstances:
                </p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 ml-4 mt-2">
                  <li>With service providers who assist in operating our website (hosting, analytics)</li>
                  <li>When required by law or to respond to legal processes</li>
                  <li>To protect our rights, privacy, safety, or property</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">5. Data Retention</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Clipboard content is automatically deleted after 24 hours or after the first view if Self-Destruct 
                  Mode is enabled. Contact form submissions are retained for up to 90 days to allow us to respond to 
                  your inquiries. Analytics data is retained in aggregate form.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">6. Data Security</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We implement industry-standard security measures to protect your information. All data transmitted 
                  between your browser and our servers is encrypted using SSL/TLS. However, no method of transmission 
                  over the Internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">7. Your Rights</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  Depending on your jurisdiction, you may have the following rights regarding your personal data:
                </p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                  <li>Right to access your personal data</li>
                  <li>Right to rectify inaccurate data</li>
                  <li>Right to erasure (right to be forgotten)</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">8. Third-Party Services</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Our website may contain links to third-party websites or services. We are not responsible for the 
                  privacy practices of these third parties. We may use Google Analytics and Google AdSense, which have 
                  their own privacy policies.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">9. Children's Privacy</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Quick Clipboard is not directed at children under the age of 13. We do not knowingly collect personal 
                  information from children under 13. If we discover that we have inadvertently collected information 
                  from a child under 13, we will delete it immediately.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">10. Changes to This Policy</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                  the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of 
                  Quick Clipboard after changes constitutes acceptance of the updated policy.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">11. Contact Us</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@quickclipboard.com" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                    privacy@quickclipboard.com
                  </a>{" "}
                  or visit our{" "}
                  <a href="/contact" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                    Contact page
                  </a>.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
