import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Check, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  url: string;
  code?: string;
}

export default function QRModal({ isOpen, onClose, title = "Share QR Code", url, code }: QRModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("share-qr-svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${code || "share"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR Code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
            <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Scan with any mobile camera to instantly access content without login.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-white/10 my-2 shadow-inner">
          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 dark:border-transparent transition-transform hover:scale-105">
            <QRCodeSVG
              id="share-qr-svg"
              value={url}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          {code && (
            <div className="mt-4 text-center">
              <span className="text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider">Share Code</span>
              <p className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-widest">{code}</p>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center break-all max-w-xs font-mono">
            {url}
          </p>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {copied ? <Check className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>

          <Button
            onClick={handleDownloadQR}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
