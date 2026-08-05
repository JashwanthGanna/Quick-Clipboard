import SEOHead from "@/components/SEOHead";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900">
      <SEOHead
        title="Disclaimer - Quick Clipboard"
        description="Read Quick Clipboard's disclaimer regarding the use of our online clipboard service, content accuracy, and limitation of liability."
        canonical="https://quickclipboard.com/disclaimer"
      />

      <section className="pt-28 lg:pt-36 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Disclaimer</h1>
          <p className="text-slate-400">Last updated: August 5, 2026</p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">General Disclaimer</h2>
              <p className="text-slate-400 leading-relaxed">
                The information and services provided by Quick Clipboard are offered on an "as is" and "as available" 
                basis. While we strive to provide a reliable and secure clipboard sharing service, we make no 
                representations or warranties of any kind, express or implied, regarding the operation of the service 
                or the accuracy, completeness, or reliability of any content shared through it.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">No Guarantee of Availability</h2>
              <p className="text-slate-400 leading-relaxed">
                We do not guarantee that Quick Clipboard will be available at all times or that the service will be 
                uninterrupted or error-free. We may experience downtime due to maintenance, updates, or technical 
                issues beyond our control. We recommend not relying solely on Quick Clipboard for critical or 
                time-sensitive data transfers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Content Responsibility</h2>
              <p className="text-slate-400 leading-relaxed">
                Quick Clipboard acts as a temporary storage and sharing medium. We are not responsible for the content 
                shared through our service. Users are solely responsible for the content they paste and share. We do 
                not monitor, review, or endorse any content transmitted through our platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Data Loss</h2>
              <p className="text-slate-400 leading-relaxed">
                While we take reasonable measures to ensure the temporary storage and retrieval of clipboard content, 
                we cannot guarantee against data loss. Clipboard content may be lost due to system errors, server 
                issues, or other unforeseen circumstances. We are not liable for any data loss that may occur.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Security Limitations</h2>
              <p className="text-slate-400 leading-relaxed">
                Although we use SSL/TLS encryption for data in transit and implement security best practices, no 
                system is completely secure. Users should exercise caution when sharing sensitive information and 
                should use the Self-Destruct Mode for confidential content. We are not responsible for unauthorized 
                access to clipboard content if the 6-digit code is shared with unintended recipients.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Third-Party Links</h2>
              <p className="text-slate-400 leading-relaxed">
                Our website may contain links to third-party websites or services that are not owned or controlled by 
                Quick Clipboard. We have no control over, and assume no responsibility for, the content, privacy 
                policies, or practices of any third-party websites or services.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Blog and Educational Content</h2>
              <p className="text-slate-400 leading-relaxed">
                The blog articles and educational content on our website are provided for informational purposes only. 
                While we strive for accuracy, we make no guarantees regarding the completeness or currentness of this 
                information. The content should not be construed as professional advice.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Limitation of Liability</h2>
              <p className="text-slate-400 leading-relaxed">
                To the fullest extent permitted by applicable law, Quick Clipboard shall not be liable for any 
                damages of any kind arising from the use of this service, including but not limited to direct, 
                indirect, incidental, punitive, and consequential damages.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Changes to This Disclaimer</h2>
              <p className="text-slate-400 leading-relaxed">
                We reserve the right to modify this disclaimer at any time. Changes will be posted on this page 
                with an updated "Last updated" date. Your continued use of Quick Clipboard after changes constitutes 
                acceptance of the updated disclaimer.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Contact</h2>
              <p className="text-slate-400 leading-relaxed">
                If you have questions about this Disclaimer, please contact us at{" "}
                <a href="mailto:legal@quickclipboard.com" className="text-purple-400 hover:text-purple-300 underline">
                  legal@quickclipboard.com
                </a>{" "}
                or visit our{" "}
                <a href="/contact" className="text-purple-400 hover:text-purple-300 underline">Contact page</a>.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
