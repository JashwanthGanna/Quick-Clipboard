import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Download,
  Copy,
  Check,
  Lock,
  Clock,
  AlertTriangle,
  QrCode,
  Eye,
  FileCheck,
  Image as ImageIcon,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QRModal from "@/components/QRModal";

export default function FileViewer() {
  const [, params] = useRoute("/share/:code");
  const code = (params?.code || "").toUpperCase();
  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [remainingTimeText, setRemainingTimeText] = useState("");

  const fileQuery = trpc.file.retrieve.useQuery(
    { code, password: submittedPassword },
    { enabled: Boolean(code), retry: false }
  );

  const textQuery = trpc.clipboard.retrieve.useQuery(
    { code, password: submittedPassword },
    { enabled: Boolean(code && fileQuery.data && "error" in fileQuery.data), retry: false }
  );

  const registerDownloadMutation = trpc.file.registerDownload.useMutation();

  const fileData = fileQuery.data && !("error" in fileQuery.data) ? fileQuery.data : null;
  const textData = textQuery.data && !("error" in textQuery.data) ? textQuery.data : null;

  const requiresPassword =
    (fileQuery.data && "requiresPassword" in fileQuery.data && fileQuery.data.requiresPassword) ||
    (textQuery.data && "requiresPassword" in textQuery.data && textQuery.data.requiresPassword);

  const activeItem = fileData || textData;

  useEffect(() => {
    if (!activeItem?.expiresAt) {
      setRemainingTimeText("Never Expires");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(activeItem.expiresAt!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setRemainingTimeText("Expired");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTimeText(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeItem?.expiresAt]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedPassword(password);
  };

  const handleCopyText = async () => {
    if (!textData?.content) return;
    try {
      await navigator.clipboard.writeText(textData.content);
      setCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text");
    }
  };

  const handleDownloadFile = async () => {
    if (!fileData || !fileData.filePath) return;
    await registerDownloadMutation.mutateAsync({ code });

    const fileName = fileData.originalName || "downloaded_file";
    const a = document.createElement("a");
    a.href = fileData.filePath;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${fileName} to your device!`);
  };

  const shareUrl = `${window.location.origin}/share/${code}`;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (fileQuery.isLoading || (fileQuery.data && "error" in fileQuery.data && textQuery.isLoading)) {
    return (
      <div className="min-h-screen pt-32 text-center text-slate-700 dark:text-slate-300">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg">Retrieving content for code <span className="font-mono text-purple-600 dark:text-purple-400">{code}</span>...</p>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 max-w-md mx-auto text-slate-900 dark:text-white">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Protected Content</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Please enter the password to access code <span className="font-mono text-purple-600 dark:text-purple-400">{code}</span></p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter access password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-center font-mono text-lg h-12"
            />
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-semibold text-white">
              Unlock Content
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!activeItem) {
    return (
      <div className="min-h-screen pt-32 text-center text-slate-900 dark:text-white px-4">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl space-y-4">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold">Content Not Found or Expired</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            The code <span className="font-mono text-rose-600 dark:text-rose-400">{code}</span> does not exist or has already self-destructed.
          </p>
          <Button onClick={() => setLocation("/")} className="bg-purple-600 hover:bg-purple-500 text-white mt-2">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-slate-900 dark:text-white transition-colors duration-300">
      {activeItem.selfDestruct && (
        <div className="mb-6 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/40 rounded-xl p-4 flex items-start gap-3 text-rose-900 dark:text-rose-200 shadow-md">
          <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-800 dark:text-rose-300">Self-Destruct Share Active</h4>
            <p className="text-sm text-rose-700 dark:text-rose-200/90">
              "This content will permanently disappear after the selected condition is met."
            </p>
            {activeItem.destructMode && (
              <span className="inline-block mt-2 text-xs font-mono bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-700/50">
                Condition: {activeItem.destructMode.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider">Share Code</span>
            <h1 className="text-3xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tracking-widest">{code}</h1>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{remainingTimeText}</span>
            </div>
            {"viewCount" in activeItem && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{activeItem.viewCount} Views</span>
              </div>
            )}
          </div>
        </div>

        {fileData ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  {fileData.mimeType && fileData.mimeType.startsWith("image/") ? (
                    <ImageIcon className="w-8 h-8" />
                  ) : (
                    <FileCheck className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white break-all">{fileData.originalName || "Shared File"}</h3>
                  <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{formatBytes(fileData.fileSize || 0)} • {fileData.mimeType || "file"}</p>
                </div>
              </div>

              <Button
                onClick={handleDownloadFile}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg"
              >
                <Download className="w-5 h-5 mr-2" /> Download File
              </Button>
            </div>

            {fileData.mimeType && fileData.mimeType.startsWith("image/") && fileData.filePath && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <img
                  src={fileData.filePath}
                  alt={fileData.originalName || "Preview"}
                  className="max-h-96 mx-auto rounded-lg object-contain shadow-md"
                />
              </div>
            )}

            {fileData.mimeType === "text/plain" && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Text File Preview</p>
                <iframe
                  src={fileData.filePath}
                  className="w-full h-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 rounded p-2 border border-slate-200 dark:border-slate-800 font-mono text-sm"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Shared Text Content</span>
              <Button onClick={handleCopyText} variant="outline" size="sm" className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                {copied ? <Check className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Text"}
              </Button>
            </div>

            <textarea
              readOnly
              value={textData?.content || ""}
              rows={10}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-slate-100 font-mono text-base focus:outline-none resize-y"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              toast.success("Share link copied!");
            }}
            variant="outline"
            className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Copy className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Copy Share Link
          </Button>

          <Button
            onClick={() => setShowQRModal(true)}
            variant="outline"
            className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <QrCode className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" /> View QR Code
          </Button>
        </div>
      </div>

      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title={`QR Code (${code})`}
        url={shareUrl}
        code={code}
      />
    </div>
  );
}
