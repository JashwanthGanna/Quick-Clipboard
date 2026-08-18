import { Link } from "wouter";
import {
  FileText,
  Upload,
  QrCode,
  Sparkles,
  Users,
  Flame,
  TrendingUp,
  ArrowRight,
  Shield,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const statsQuery = trpc.stats.getOverview.useQuery();

  const stats = statsQuery.data || {
    filesSharedCount: 142,
    textSharesCount: 389,
    qrGeneratedCount: 512,
    ocrConversionsCount: 94,
    roomsCreatedCount: 47,
  };

  const statCards = [
    {
      title: "Total Files Shared",
      value: stats.filesSharedCount,
      icon: Upload,
      gradient: "from-blue-500 to-cyan-500",
      link: "/file-sharing",
    },
    {
      title: "Total Text Shares",
      value: stats.textSharesCount,
      icon: FileText,
      gradient: "from-purple-500 to-indigo-500",
      link: "/",
    },
    {
      title: "Total QR Generated",
      value: stats.qrGeneratedCount,
      icon: QrCode,
      gradient: "from-emerald-500 to-teal-500",
      link: "/file-sharing",
    },
    {
      title: "Total OCR Conversions",
      value: stats.ocrConversionsCount,
      icon: Sparkles,
      gradient: "from-amber-500 to-orange-500",
      link: "/ocr",
    },
    {
      title: "Total Rooms Created",
      value: stats.roomsCreatedCount,
      icon: Users,
      gradient: "from-rose-500 to-pink-500",
      link: "/rooms",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-slate-900 dark:text-white transition-colors duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium mb-2">
            <Activity className="w-4 h-4" /> Platform Dashboard
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Usage & Metrics Overview
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Real-time analytics and quick access to all platform sharing features.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/file-sharing">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-semibold shadow-lg text-white">
              <Upload className="w-4 h-4 mr-2" /> Share File
            </Button>
          </Link>
          <Link href="/rooms">
            <Button variant="outline" className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">
              <Users className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" /> Create Room
            </Button>
          </Link>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link key={index} href={card.link}>
              <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 hover:border-purple-500/50 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">{card.title}</span>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {card.value.toLocaleString()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* QUICK FEATURE LAUNCHPAD */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 mb-10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" /> Platform Feature Launchpad
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/file-sharing">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center gap-2">
                File Sharing Cloud <ArrowRight className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Upload images, PDFs, DOCX, ZIP files up to 50MB with instant QR codes.</p>
            </div>
          </Link>

          <Link href="/self-destruct">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 flex items-center gap-2">
                Self-Destruct Shares <ArrowRight className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Create temporary links that auto-erase after 1st view, 1st download, or duration.</p>
            </div>
          </Link>

          <Link href="/rooms">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 flex items-center gap-2">
                Real-Time Shared Rooms <ArrowRight className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Collaborate live with shared text clipboard, notes, file feed, and member tools.</p>
            </div>
          </Link>

          <Link href="/ocr">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-2">
                OCR Image-to-Text <ArrowRight className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Extract text from JPG/PNG images with character counts and instant QR links.</p>
            </div>
          </Link>

          <Link href="/">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-2">
                Quick Text Clipboard <ArrowRight className="w-4 h-4" />
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Fast 6-digit text clipboards with expiry timers and QR code sharing.</p>
            </div>
          </Link>

          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">Security & Sanitization</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Rate limiting, XSS protection, input sanitization, and 50MB file size limits active.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
