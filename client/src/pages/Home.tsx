import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Copy, Share2, Eye, Clock, Zap, Download, Sparkles, Bolt,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { QRCodeSVG as QRCode } from "qrcode.react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";
import AdSlot from "@/components/AdSlot";
import { features } from "@/data/features";
import { faqItems } from "@/data/faq";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function Home() {
  const [shareContent, setShareContent] = useState("");
  const [selfDestructEnabled, setSelfDestructEnabled] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const [, setSharedAt] = useState<Date | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const [retrieveCode, setRetrieveCode] = useState("");
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievedContent, setRetrievedContent] = useState<string | null>(null);
  const [retrievedMetadata, setRetrievedMetadata] = useState<any>(null);

  const clipboardAnim = useInView();
  const featuresAnim = useInView();
  const howItWorksAnim = useInView();
  const faqAnim = useInView();
  const ctaAnim = useInView();

  const sendMutation = trpc.clipboard.send.useMutation();
  const retrieveQuery = trpc.clipboard.retrieve.useQuery(
    { code: retrieveCode },
    { enabled: false }
  );

  const handleShare = async () => {
    if (!shareContent.trim()) {
      toast.error("Please enter some content to share");
      return;
    }

    setIsSharing(true);
    try {
      const result = await sendMutation.mutateAsync({
        content: shareContent,
        selfDestruct: selfDestructEnabled,
      });

      setSharedCode(result.code);
      setSharedAt(new Date());
      setShareContent("");
      toast.success("Clipboard shared successfully!");
    } catch (error) {
      toast.error("Failed to share clipboard");
      console.error(error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRetrieve = async () => {
    if (retrieveCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsRetrieving(true);
    try {
      const result = await retrieveQuery.refetch();
      if (result.data && "content" in result.data && result.data.content) {
        setRetrievedContent(result.data.content);
        setRetrievedMetadata({
          selfDestruct: result.data.selfDestruct,
          expiresAt: result.data.expiresAt,
        });
        toast.success("Clipboard retrieved successfully!");
      } else {
        toast.error((result.data && "error" in result.data && result.data.error) || "Clipboard not found or expired");
      }
    } catch (error) {
      toast.error("Failed to retrieve clipboard");
      console.error(error);
    } finally {
      setIsRetrieving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!sharedCode) return;
    try {
      await navigator.clipboard.writeText(sharedCode);
      toast.success("Code copied to clipboard!");
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyContent = async () => {
    if (!retrievedContent) return;
    try {
      await navigator.clipboard.writeText(retrievedContent);
      toast.success("Content copied to clipboard!");
    } catch {
      toast.error("Failed to copy content");
    }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `clipboard-${sharedCode}.png`;
      link.click();
      toast.success("QR code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const shareLink = sharedCode ? `${window.location.origin}?code=${sharedCode}` : "";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && code.length === 6) {
      setRetrieveCode(code);
    }
  }, []);

  useEffect(() => {
    if (retrievedContent && retrieveCode) {
      const interval = setInterval(() => {
        retrieveQuery.refetch();
      }, 5000);
      setAutoRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [retrievedContent, retrieveCode, retrieveQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !sharedCode && shareContent.trim()) {
        handleShare();
      }
      if (e.key === "Enter" && (e.target as HTMLInputElement)?.placeholder === "000000" && retrieveCode.length === 6) {
        handleRetrieve();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shareContent, sharedCode, retrieveCode]);

  const howItWorksSteps = [
    {
      step: 1,
      title: "Paste Your Text",
      description: "Type or paste any text content into the Share box. Code snippets, notes, URLs — anything goes.",
      icon: Copy,
      color: "from-purple-500 to-purple-600",
    },
    {
      step: 2,
      title: "Get Your Code",
      description: "Click 'Send to Clipboard' and receive a unique 6-digit code, share link, and QR code instantly.",
      icon: Share2,
      color: "from-blue-500 to-blue-600",
    },
    {
      step: 3,
      title: "Retrieve Anywhere",
      description: "Enter the code on any device to retrieve your text. That's it — fast, secure, and effortless.",
      icon: Eye,
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300">
      <SEOHead
        title="Quick Clipboard - Free Online Clipboard | Share Text Instantly"
        description="Quick Clipboard is a free, fast, and secure online clipboard tool. Share text instantly with a unique 6-digit code. No login required."
        canonical="https://quickclipboard.com/"
        keywords="online clipboard, clipboard sharing, share text online, copy paste online, quick clipboard, text sharing tool"
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* PLATFORM NAVIGATION LAUNCHBAR */}
        <div className="pt-24 max-w-6xl mx-auto px-4">
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs uppercase font-mono text-purple-600 dark:text-purple-400 font-bold tracking-wider">Use your own choice</span>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/file-sharing" className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-500/20 transition">
                📁 File Sharing
              </a>
              <a href="/self-destruct" className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-500/20 transition">
                🔥 Self-Destruct
              </a>
              <a href="/rooms" className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/20 transition">
                👥 Shared Rooms
              </a>
              <a href="/ocr" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/20 transition">
                ✨ OCR Image-to-Text
              </a>
            </div>
          </div>
        </div>

        <section id="clipboard" ref={clipboardAnim.ref} className="pt-8 pb-8">
          <div className={`max-w-6xl mx-auto px-4 transition-all duration-700 ${clipboardAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Card className="relative backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-purple-500/50 transition duration-300 overflow-hidden shadow-xl dark:shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    
                    <div className="relative p-8 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                          <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Share</h2>
                        <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />
                      </div>

                      {!sharedCode ? (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          <div>
                            <label htmlFor="share-textarea" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                              Text to Share
                            </label>
                            <Textarea
                              id="share-textarea"
                              placeholder="Type or paste text here to share..."
                              value={shareContent}
                              onChange={(e) => setShareContent(e.target.value)}
                              className="min-h-40 resize-none bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50 transition duration-300"
                              aria-label="Text content to share"
                              aria-describedby="share-char-count"
                            />
                            <div id="share-char-count" className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                              <span>{shareContent.length.toLocaleString()} characters</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg hover:border-purple-500/30 transition duration-300">
                            <Checkbox
                              id="self-destruct"
                              checked={selfDestructEnabled}
                              onCheckedChange={(checked) =>
                                setSelfDestructEnabled(checked as boolean)
                              }
                              className="border-slate-400 dark:border-white/20"
                            />
                            <Label
                              htmlFor="self-destruct"
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <Zap className="w-4 h-4 text-amber-500 dark:text-yellow-400" />
                              <span className="text-slate-900 dark:text-white font-medium">Self-Destruct Mode</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">(Delete after first view)</span>
                            </Label>
                          </div>

                          <Button
                            onClick={handleShare}
                            disabled={isSharing || !shareContent.trim()}
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send text to clipboard (Ctrl+Enter)"
                          >
                            {isSharing ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Sharing...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Bolt className="w-4 h-4" />
                                Send to Clipboard
                              </span>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                          <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
                            <p className="text-emerald-700 dark:text-green-300 text-sm font-medium flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Shared successfully!
                            </p>
                          </div>

                          <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg hover:border-purple-500/30 transition duration-300">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">
                              6-Digit Code
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 p-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg">
                                <code className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent tracking-widest font-mono">
                                  {sharedCode}
                                </code>
                              </div>
                              <Button
                                onClick={handleCopyCode}
                                size="sm"
                                variant="outline"
                                className="h-12 w-12 p-0 bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition duration-300"
                                aria-label="Copy 6-digit code"
                              >
                                <Copy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </Button>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg hover:border-blue-500/30 transition duration-300">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">
                              Share Link
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={shareLink}
                                readOnly
                                className="text-sm bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-300"
                              />
                              <Button
                                onClick={handleCopyShareLink}
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0 bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition duration-300"
                                aria-label="Copy share link"
                              >
                                <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </Button>
                            </div>
                          </div>

                          <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg flex flex-col items-center gap-3 hover:border-cyan-500/30 transition duration-300">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              QR Code
                            </label>
                            <div ref={qrRef} className="p-3 bg-white rounded-lg shadow-sm">
                              <QRCode
                                value={shareLink}
                                size={160}
                                level="H"
                                includeMargin={true}
                                fgColor="#000000"
                                bgColor="#ffffff"
                              />
                            </div>
                            <Button
                              onClick={handleDownloadQR}
                              size="sm"
                              variant="outline"
                              className="w-full bg-slate-100 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition duration-300 text-slate-900 dark:text-white"
                              aria-label="Download QR code as PNG image"
                            >
                              <Download className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                              Download QR Code
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                            <div className="p-2 bg-slate-100 dark:bg-slate-900/50 rounded text-center border border-slate-200 dark:border-white/5">
                              <p className="text-xs text-slate-600 dark:text-slate-400">Expires In</p>
                              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">24 hours</p>
                            </div>
                            <div className="p-2 bg-slate-100 dark:bg-slate-900/50 rounded text-center border border-slate-200 dark:border-white/5">
                              <p className="text-xs text-slate-600 dark:text-slate-400">Mode</p>
                              <p className="text-sm font-semibold text-amber-600 dark:text-yellow-400">
                                {selfDestructEnabled ? "Self-Destruct" : "Normal"}
                              </p>
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              setSharedCode(null);
                              setSharedAt(null);
                            }}
                            variant="outline"
                            className="w-full border-slate-300 dark:border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 text-slate-700 dark:text-slate-300 transition duration-300"
                          >
                            Share Another
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>

              <div className="group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Card className="relative backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-blue-500/50 transition duration-300 overflow-hidden shadow-xl dark:shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    
                    <div className="relative p-8 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Retrieve</h2>
                        <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />
                      </div>

                      {!retrievedContent ? (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          <div>
                            <label htmlFor="retrieve-code" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                              Enter 6-Digit Code
                            </label>
                            <Input
                              id="retrieve-code"
                              placeholder="123456"
                              value={retrieveCode}
                              onChange={(e) =>
                                setRetrieveCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                              }
                              maxLength={6}
                              className="text-center text-4xl tracking-widest font-mono bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-blue-500/50 transition duration-300 h-16"
                              aria-label="6-digit clipboard code"
                              aria-describedby="retrieve-hint"
                            />
                            <p id="retrieve-hint" className="text-xs text-slate-400 mt-3">
                              Press Enter to retrieve
                            </p>
                          </div>

                          <Button
                            onClick={handleRetrieve}
                            disabled={isRetrieving || retrieveCode.length !== 6}
                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Retrieve clipboard content"
                          >
                            {isRetrieving ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Retrieving...
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Retrieve Clipboard
                              </span>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                          <div className="p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm font-medium flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Retrieved successfully!
                            </p>
                          </div>

                          {retrievedMetadata?.selfDestruct && (
                            <div className="p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-lg">
                              <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Self-destruct mode enabled - This content will be deleted after viewing
                              </p>
                            </div>
                          )}

                          <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg max-h-64 overflow-y-auto">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wider">
                              Content
                            </p>
                            <p className="text-slate-900 dark:text-slate-200 whitespace-pre-wrap break-words">{retrievedContent}</p>
                          </div>

                          {retrievedMetadata?.expiresAt && (
                            <div className="p-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg">
                              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500 dark:text-orange-400" />
                                Expires: {new Date(retrievedMetadata.expiresAt).toLocaleString()}
                              </p>
                            </div>
                          )}

                          <Button
                            onClick={handleCopyContent}
                            className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition duration-300 transform hover:scale-105 active:scale-95"
                            aria-label="Copy retrieved content to system clipboard"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to Clipboard
                          </Button>

                          <Button
                            onClick={() => {
                              setRetrievedContent(null);
                              setRetrievedMetadata(null);
                              setRetrieveCode("");
                              if (autoRefreshInterval) {
                                clearInterval(autoRefreshInterval);
                                setAutoRefreshInterval(null);
                              }
                            }}
                            variant="outline"
                            className="w-full border-slate-300 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 text-slate-700 dark:text-slate-300 transition duration-300"
                          >
                            Retrieve Another
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AdSlot format="horizontal" className="my-4 max-w-6xl mx-auto px-4" />

        <section id="features" ref={featuresAnim.ref} className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 transition-all duration-700 ${featuresAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <span className="inline-block text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3">Features</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                Everything You Need,{" "}
                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">Nothing You Don't</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Quick Clipboard is designed to be the simplest, fastest, and most secure way to share text online.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.id}
                    className={`group relative transition-all duration-700 ${featuresAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.bgColor} rounded-xl blur-xl opacity-0 group-hover:opacity-60 transition duration-500`}></div>
                    <Card className={`relative backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 ${feature.borderColor} transition duration-300 p-6 hover:scale-105 transform shadow-lg dark:shadow-none`}>
                      <div className={`p-3 ${feature.bgColor} rounded-lg w-fit mb-4`}>
                        <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" ref={howItWorksAnim.ref} className="py-20 lg:py-28 border-t border-slate-200 dark:border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 transition-all duration-700 ${howItWorksAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <span className="inline-block text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">How It Works</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                Three Simple Steps
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Share text across any device in seconds. No accounts, no installations — just pure simplicity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {howItWorksSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className={`relative text-center transition-all duration-700 ${howItWorksAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                    style={{ transitionDelay: `${i * 200}ms` }}
                  >
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-6">
                      <div className={`absolute inset-0 bg-gradient-to-r ${step.color} rounded-2xl opacity-20`}></div>
                      <span className="relative text-2xl font-bold text-slate-900 dark:text-white">{step.step}</span>
                    </div>

                    <div className={`inline-flex p-3 bg-gradient-to-r ${step.color} rounded-xl mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>

                    {i < howItWorksSteps.length - 1 && (
                      <div className="hidden md:block absolute top-8 right-0 w-1/2 h-px bg-gradient-to-r from-slate-300 dark:from-white/10 to-transparent translate-x-full"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <AdSlot format="rectangle" className="my-4 max-w-6xl mx-auto px-4" />

        <section id="faq" ref={faqAnim.ref} className="py-20 lg:py-28 border-t border-slate-200 dark:border-white/5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 transition-all duration-700 ${faqAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <span className="inline-block text-sm font-semibold text-emerald-600 dark:text-green-400 uppercase tracking-wider mb-3">FAQ</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Have questions? We've got answers.
              </p>
            </div>

            <Accordion
              type="single"
              collapsible
              className={`space-y-3 transition-all duration-700 ${faqAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              {faqItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="backdrop-blur-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-6 hover:border-green-500/30 transition-colors duration-300 data-[state=open]:border-green-500/30 shadow-md dark:shadow-none"
                >
                  <AccordionTrigger className="text-left text-slate-900 dark:text-white font-medium py-5 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 dark:text-slate-400 pb-5 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section id="cta" ref={ctaAnim.ref} className="py-20 lg:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`relative overflow-hidden rounded-3xl transition-all duration-700 ${ctaAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600"></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
              
              <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Ready to Start Sharing?
                </h2>
                <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                  Join thousands of users who trust Quick Clipboard for fast, secure text sharing. No sign-up required.
                </p>
                <Button
                  onClick={() => {
                    document.getElementById("clipboard")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="h-14 px-10 bg-white text-slate-900 hover:bg-white/90 font-bold rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
                >
                  <Bolt className="w-5 h-5 mr-2" />
                  Try Quick Clipboard — It's Free
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
