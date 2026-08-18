import { useParams } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar, Clock, ArrowLeft, ArrowRight, User, Share2,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import AdSlot from "@/components/AdSlot";
import { blogPosts } from "@/data/blogPosts";

// Simple markdown-to-JSX renderer for blog content
function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let key = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${key++}`} className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1 ml-4 mb-4">
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
      if (match) {
        currentList.push(`${match[1]}: ${match[2] || ""}`);
      } else {
        currentList.push(line.slice(2));
      }
    } else if (line.startsWith("- ")) {
      currentList.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      const parts = line.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={key++} className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="text-slate-900 dark:text-slate-200 font-semibold">{part}</strong>
            ) : (
              part
            )
          )}
        </p>
      );
    }
  }
  flushList();
  return elements;
}

export default function BlogPost() {
  const params = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === params.slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Article Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">The blog post you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = blogPosts.filter((p) => p.slug !== params.slug);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled sharing
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
      <SEOHead
        title={`${post.title} - Quick Clipboard Blog`}
        description={post.excerpt}
        canonical={`https://quickclipboard.com/blog/${post.slug}`}
        ogType="article"
        keywords={`${post.category.toLowerCase()}, online clipboard, ${post.title.toLowerCase().split(" ").slice(0, 5).join(", ")}`}
      />

      {/* Article Header */}
      <section className="pt-28 lg:pt-36 pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-6 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Blog
          </Link>

          <div className="mb-6">
            <span className="inline-block bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {post.category}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" /> {post.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {post.readTime}
              </span>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-medium"
                aria-label="Share this article"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 lg:p-10 shadow-xl dark:shadow-none">
            {renderMarkdown(post.content)}
          </div>

          {/* AdSense Placeholder */}
          <AdSlot format="rectangle" className="mt-8" />
        </div>
      </article>

      {/* Schema.org Article Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            author: { "@type": "Organization", name: post.author },
            datePublished: post.date,
            publisher: {
              "@type": "Organization",
              name: "Quick Clipboard",
              logo: { "@type": "ImageObject", url: "https://quickclipboard.com/favicon.svg" },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://quickclipboard.com/blog/${post.slug}`,
            },
          }),
        }}
      />

      {/* Related Posts */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedPosts.map((related) => (
              <Link key={related.slug} href={`/blog/${related.slug}`}>
                <Card className="group backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-purple-500/30 transition-all duration-300 p-6 cursor-pointer shadow-lg dark:shadow-none">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(related.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span>{related.readTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{related.excerpt}</p>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center">
                    Read More <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
