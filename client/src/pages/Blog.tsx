import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, BookOpen, Tag } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import AdSlot from "@/components/AdSlot";
import { blogPosts } from "@/data/blogPosts";

export default function Blog() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900">
      <SEOHead
        title="Blog - Quick Clipboard | Tips, Guides & Productivity"
        description="Read our latest articles on productivity, cross-device text sharing, clipboard security, and tips to work smarter. Expert insights from the Quick Clipboard team."
        canonical="https://quickclipboard.com/blog"
        keywords="online clipboard blog, productivity tips, text sharing guide, clipboard security"
      />

      {/* Hero */}
      <section className="pt-28 lg:pt-36 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-6">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Blog & Resources</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-6">
            Tips, Guides &{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Insights
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Expert articles on productivity, clipboard sharing, data privacy, and working smarter across devices.
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, i) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="group backdrop-blur-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 overflow-hidden h-full flex flex-col cursor-pointer hover:scale-[1.02] transform">
                  {/* Gradient header */}
                  <div className={`h-48 relative overflow-hidden ${
                    i === 0 ? "bg-gradient-to-br from-purple-600/40 to-blue-600/40" :
                    i === 1 ? "bg-gradient-to-br from-blue-600/40 to-cyan-600/40" :
                    "bg-gradient-to-br from-green-600/40 to-emerald-600/40"
                  }`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/20 group-hover:text-white/30 transition-colors duration-300" />
                    </div>
                    {/* Category badge */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1 bg-black/30 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
                        <Tag className="w-3 h-3" />
                        {post.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-200 line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-3">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                      Read Article
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* AdSense Placeholder */}
          <AdSlot format="horizontal" className="mt-12" />
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="backdrop-blur-xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/20 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to Try Quick Clipboard?</h2>
            <p className="text-slate-400 mb-6">
              Start sharing text between your devices in seconds. No sign-up required.
            </p>
            <Link href="/">
              <Button className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl">
                Try It Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
