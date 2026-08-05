import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bolt, Heart, Zap, Shield, Globe, Users, Target, ArrowRight,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function About() {
  const values = [
    {
      icon: Zap,
      title: "Speed First",
      description: "Every millisecond matters. We've optimized every layer of our stack to deliver sub-second clipboard operations worldwide.",
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
    },
    {
      icon: Shield,
      title: "Privacy by Design",
      description: "Your data is encrypted in transit, auto-expires after 24 hours, and can self-destruct after one view. We collect zero personal information.",
      color: "text-green-400",
      bg: "bg-green-500/20",
    },
    {
      icon: Heart,
      title: "Free Forever",
      description: "Quick Clipboard is and always will be free. No premium tiers, no usage limits, no credit cards — just a useful tool for everyone.",
      color: "text-red-400",
      bg: "bg-red-500/20",
    },
  ];

  const stats = [
    { value: "50K+", label: "Active Users", icon: Users },
    { value: "1M+", label: "Clipboards Shared", icon: Bolt },
    { value: "99.9%", label: "Uptime", icon: Target },
    { value: "150+", label: "Countries", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900">
      <SEOHead
        title="About Us - Quick Clipboard | Our Mission & Story"
        description="Learn about Quick Clipboard's mission to make text sharing fast, secure, and accessible to everyone. Discover our story, values, and the team behind the tool."
        canonical="https://quickclipboard.com/about"
        keywords="about quick clipboard, online clipboard tool, text sharing mission"
      />

      {/* Hero */}
      <section className="pt-28 lg:pt-36 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">About Us</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Making Text Sharing{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Effortless
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Quick Clipboard was born from a simple frustration: why is it so hard to move text between devices?
            We built the tool we wished existed — fast, secure, and dead simple.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  It started with a developer copying a URL on their laptop, then reaching for their phone to type it
                  character by character. That moment of friction — so small yet so frequent — sparked the idea for
                  Quick Clipboard.
                </p>
                <p>
                  We envisioned a tool that requires zero setup: no accounts, no apps to install, no learning curve.
                  Just paste your text, get a code, and retrieve it anywhere. Three steps, three seconds, done.
                </p>
                <p>
                  Today, Quick Clipboard serves users across 150+ countries, handling over a million clipboard
                  operations. And we're just getting started.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl"></div>
              <Card className="relative backdrop-blur-xl bg-white/5 border border-white/10 p-8">
                <div className="space-y-6">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center gap-4">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                          <p className="text-sm text-slate-400">{stat.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Our Values</h2>
            <p className="text-lg text-slate-400">The principles that guide everything we build.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <Card key={v.title} className="backdrop-blur-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 p-8 text-center">
                  <div className={`inline-flex p-3 ${v.bg} rounded-xl mb-4`}>
                    <Icon className={`w-6 h-6 ${v.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{v.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{v.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want to Get in Touch?</h2>
          <p className="text-lg text-slate-400 mb-8">
            Have feedback, questions, or partnership ideas? We'd love to hear from you.
          </p>
          <Link href="/contact">
            <Button className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl">
              Contact Us <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
