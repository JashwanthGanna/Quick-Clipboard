import { useState, useRef } from "react";
import { createWorker } from "tesseract.js";
import {
  Copy,
  Check,
  Download,
  Share2,
  QrCode,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QRModal from "@/components/QRModal";

export default function OCRPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [extractedText, setExtractedText] = useState("");

  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);
  const [createdShareCode, setCreatedShareCode] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendTextMutation = trpc.clipboard.send.useMutation();
  const trackActionMutation = trpc.stats.trackAction.useMutation();

  const handleImageSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      toast.error("Please upload JPG, PNG, or WEBP images only.");
      return;
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setExtractedText("");
    setCreatedShareUrl(null);
  };

  const handleProcessOCR = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first.");
      return;
    }

    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStatus("Initializing OCR engine...");

    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            const pct = Math.round(m.progress * 100);
            setProgressPercent(pct);
            setProgressStatus(`Extracting text: ${pct}%`);
          } else {
            setProgressStatus(m.status);
          }
        },
      });

      setProgressStatus("Analyzing characters & lines...");
      const { data } = await worker.recognize(selectedImage);
      await worker.terminate();

      const text = data.text.trim();
      setExtractedText(text);
      setIsProcessing(false);
      setProgressPercent(100);

      trackActionMutation.mutate({ type: "ocr" });
      toast.success("Text extracted successfully!");
    } catch (err: any) {
      setIsProcessing(false);
      toast.error(err.message || "Failed to extract text from image.");
    }
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast.success("Extracted text copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed.");
    }
  };

  const handleDownloadText = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OCR_${Date.now()}.txt`;
    a.click();
    toast.success("Downloaded text file!");
  };

  const handleCreateShareLink = async () => {
    if (!extractedText) return;
    try {
      const res = await sendTextMutation.mutateAsync({
        content: extractedText,
        expiryOption: "24h",
      });
      const shareUrl = `${window.location.origin}/share/${res.code}`;
      setCreatedShareUrl(shareUrl);
      setCreatedShareCode(res.code);
      toast.success("Share link created for extracted text!");
    } catch {
      toast.error("Failed to create share link.");
    }
  };

  const charCount = extractedText.length;
  const wordCount = extractedText ? extractedText.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-slate-900 dark:text-white transition-colors duration-300">
      {/* HEADER */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4" /> AI OCR Engine
        </div>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
          Image-to-Text Extractor
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto">
          Extract typed or written English text, numbers & symbols from JPG, PNG, or WEBP images instantly.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
        {/* DRAG & DROP AREA */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
          />

          {!selectedImage ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Upload Image (JPG, PNG, WEBP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click to select image file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Selected: {selectedImage.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click to change image</p>
            </div>
          )}
        </div>

        {/* PROCESSING ANIMATION */}
        {isProcessing && (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-emerald-300 dark:border-emerald-500/30 text-center">
            <Loader2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{progressStatus}</p>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* START PROCESS BUTTON */}
        {selectedImage && !isProcessing && !extractedText && (
          <Button
            onClick={handleProcessOCR}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg rounded-xl shadow-lg"
          >
            Extract Text Now
          </Button>
        )}

        {/* OCR RESULTS DISPLAY */}
        {extractedText && (
          <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" /> Text Extracted Successfully
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{charCount} Characters</span>
                <span>{wordCount} Words</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ORIGINAL IMAGE PREVIEW */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center justify-center">
                <span className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2">Original Image</span>
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Original"
                    className="max-h-72 rounded-lg object-contain border border-slate-200 dark:border-slate-800"
                  />
                )}
              </div>

              {/* EXTRACTED TEXT EDITOR */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col">
                <span className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-2">Extracted Text</span>
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  rows={10}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-slate-900 dark:text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500 flex-1 resize-y"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <Button
                onClick={handleCopyText}
                variant="outline"
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {copied ? <Check className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Text"}
              </Button>

              <Button
                onClick={handleDownloadText}
                variant="outline"
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" /> Download TXT
              </Button>

              <Button
                onClick={handleCreateShareLink}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" /> Create Share Link
              </Button>

              <Button
                onClick={() => setShowQRModal(true)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <QrCode className="w-4 h-4 mr-2" /> Create QR
              </Button>
            </div>

            {/* CREATED SHARE LINK CARD */}
            {createdShareUrl && (
              <div className="bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-500/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase text-purple-700 dark:text-purple-300 font-bold">Generated Share Link</span>
                  <p className="text-sm font-mono text-slate-900 dark:text-white truncate">{createdShareUrl}</p>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(createdShareUrl);
                    toast.success("Link copied!");
                  }}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white shrink-0 ml-2"
                >
                  Copy Link
                </Button>
              </div>
            )}

            <QRModal
              isOpen={showQRModal}
              onClose={() => setShowQRModal(false)}
              title="OCR Text QR Code"
              url={createdShareUrl || window.location.href}
              code={createdShareCode || undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
