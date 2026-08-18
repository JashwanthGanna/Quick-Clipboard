import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Mail, Clock, MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import SEOHead from "@/components/SEOHead";
import { trpc } from "@/lib/trpc";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contactMutation = trpc.contact.submit.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await contactMutation.mutateAsync(formData);
      setSubmitted(true);
      toast.success("Message sent successfully! We'll get back to you soon.");
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      description: "support@quickclipboard.com",
      detail: "We respond within 24 hours",
    },
    {
      icon: Clock,
      title: "Response Time",
      description: "Within 24 hours",
      detail: "Monday to Friday",
    },
    {
      icon: MessageSquare,
      title: "Community",
      description: "Join our Discord",
      detail: "Get help from the community",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
      <SEOHead
        title="Contact Us - Quick Clipboard | Get in Touch"
        description="Have questions, feedback, or suggestions? Contact the Quick Clipboard team. We'd love to hear from you and typically respond within 24 hours."
        canonical="https://quickclipboard.com/contact"
        keywords="contact quick clipboard, clipboard support, get in touch"
      />

      <section className="pt-28 lg:pt-36 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Contact</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">
            Get in{" "}
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Have a question, feedback, or just want to say hi? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info Sidebar */}
            <div className="space-y-4">
              {contactInfo.map((info) => {
                const Icon = info.icon;
                return (
                  <Card key={info.title} className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-purple-500/30 transition-all duration-300 p-6 shadow-lg dark:shadow-none">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{info.title}</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{info.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{info.detail}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              <Card className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 shadow-lg dark:shadow-none">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Looking for answers?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Check our FAQ section for quick answers to common questions.
                </p>
                <Link href="/#faq">
                  <Button variant="outline" size="sm" className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5">
                    View FAQ <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 shadow-xl dark:shadow-none">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 bg-emerald-500/10 dark:bg-green-500/20 rounded-full mb-6">
                      <Send className="w-8 h-8 text-emerald-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Message Sent!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({ name: "", email: "", subject: "", message: "" });
                      }}
                      variant="outline"
                      className="border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="contact-name" className="text-slate-700 dark:text-slate-300 mb-2 block">
                          Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="contact-name"
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50"
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email" className="text-slate-700 dark:text-slate-300 mb-2 block">
                          Email <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50"
                          required
                          aria-required="true"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact-subject" className="text-slate-700 dark:text-slate-300 mb-2 block">
                        Subject <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="contact-subject"
                        placeholder="What's this about?"
                        value={formData.subject}
                        onChange={(e) => handleChange("subject", e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50"
                        required
                        aria-required="true"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact-message" className="text-slate-700 dark:text-slate-300 mb-2 block">
                        Message <span className="text-rose-500">*</span>
                      </Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Your message..."
                        value={formData.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        className="min-h-36 resize-none bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50"
                        required
                        aria-required="true"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Message
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
