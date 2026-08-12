import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileCheck,
  Copy,
  Check,
  Download,
  Share2,
  Lock,
  Clock,
  QrCode,
  Trash2,
  Search,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QRModal from "@/components/QRModal";

export default function FileSharing() {
  const [activeTab, setActiveTab] = useState<"upload" | "retrieve">("upload");

  // Upload tab states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [expiryOption, setExpiryOption] = useState<string>("24h");
  const [password, setPassword] = useState("");
  const [enablePassword, setEnablePassword] = useState(false);
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [destructMode, setDestructMode] = useState<"view" | "download" | "time" | "none">("none");

  // Retrieve tab states
  const [retrieveCode, setRetrieveCode] = useState("");
  const [retrievePassword, setRetrievePassword] = useState("");
  const [queryCode, setQueryCode] = useState("");
  const [queryPassword, setQueryPassword] = useState("");

  // Result state
  const [uploadResult, setUploadResult] = useState<{
    code: string;
    shareUrl: string;
    filePath: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ url: string; code?: string; title?: string }>({ url: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.file.upload.useMutation({
    onSuccess: (data) => {
      setUploadResult({
        code: data.code,
        shareUrl: `${window.location.origin}/share/${data.code}`,
        filePath: data.filePath,
        originalName: selectedFile?.name || "file",
        fileSize: selectedFile?.size || 0,
        mimeType: selectedFile?.type || "application/octet-stream",
      });
      setIsUploading(false);
      setUploadProgress(100);
      toast.success("File uploaded successfully!");
    },
    onError: (err) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(err.message || "Failed to upload file.");
    },
  });

  const retrieveQuery = trpc.file.retrieve.useQuery(
    { code: queryCode, password: queryPassword || undefined },
    {
      enabled: Boolean(queryCode && queryCode.length === 6),
      retry: false,
    }
  );

  const registerDownloadMutation = trpc.file.registerDownload.useMutation();

  const handleFileSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds maximum 50MB limit.");
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 70) + 15;
        setUploadProgress(percent);
      }
    };

    reader.onload = () => {
      setUploadProgress(90);
      uploadMutation.mutate({
        filename: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        fileSize: selectedFile.size,
        base64Data: reader.result as string,
        password: enablePassword ? password : undefined,
        selfDestruct,
        destructMode: selfDestruct ? destructMode : "none",
        expiryOption: expiryOption as any,
      });
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Failed to read file.");
    };

    reader.readAsDataURL(selectedFile);
  };

  const triggerDeviceDownload = async (filePath: string, filename: string, codeToRegister?: string) => {
    try {
      if (codeToRegister) {
        await registerDownloadMutation.mutateAsync({ code: codeToRegister });
      }
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = filePath;
      downloadAnchor.download = filename;
      downloadAnchor.target = "_blank";
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      toast.success(`Downloading ${filename} to your device!`);
    } catch {
      toast.error("Failed to start file download.");
    }
  };

  const handleRetrieveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = retrieveCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast.error("Please enter a valid 6-digit numeric code.");
      return;
    }
    setQueryCode(cleanCode);
    setQueryPassword(retrievePassword);
  };

  // Auto trigger download when retrieve query successfully returns a file
  const retrievedFile = retrieveQuery.data && !("error" in retrieveQuery.data) && !retrieveQuery.data.requiresPassword ? retrieveQuery.data : null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mime?: string, name?: string) => {
    if (!mime || !name) return <FileCheck className="w-8 h-8 text-indigo-500" />;
    const ext = name.split(".").pop()?.toLowerCase();
    if (mime.startsWith("image/") || ["jpg", "png", "webp"].includes(ext || "")) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    }
    if (ext === "pdf") return <FileText className="w-8 h-8 text-red-500" />;
    if (["doc", "docx", "txt"].includes(ext || "")) return <FileText className="w-8 h-8 text-sky-500" />;
    if (["ppt", "pptx"].includes(ext || "")) return <FileText className="w-8 h-8 text-amber-500" />;
    if (["xls", "xlsx"].includes(ext || "")) return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    if (ext === "zip") return <FileArchive className="w-8 h-8 text-purple-500" />;
    return <FileCheck className="w-8 h-8 text-indigo-500" />;
  };

  const copyToClipboard = async (text: string, isLink: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isLink) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      toast.success(isLink ? "Share link copied!" : "Share code copied!");
    } catch {
      toast.error("Copy failed.");
    }
  };

  const handleShareEmail = (name: string, url: string, codeStr: string) => {
    const subject = encodeURIComponent(`Shared File: ${name}`);
    const body = encodeURIComponent(
      `Hello,\n\nI shared a file with you via Quick Clipboard:\nFile: ${name}\nLink: ${url}\nCode: ${codeStr}\n\nAccess it now!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-slate-900 dark:text-white transition-colors duration-300">
      {/* HEADER */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-medium mb-3">
          <Upload className="w-4 h-4" /> Secure File Cloud
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
          Fast & Secure File Sharing
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Upload or retrieve files instantly using 6-digit numeric codes. Auto-downloads straight to your device.
        </p>
      </div>

      {/* TOP TAB SWITCHER: UPLOAD vs RETRIEVE */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1.5 bg-slate-200 dark:bg-slate-900/90 border border-slate-300 dark:border-white/10 rounded-2xl shadow-inner max-w-md w-full">
          <button
            onClick={() => {
              setActiveTab("upload");
              setQueryCode("");
            }}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "upload"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Upload className="w-4 h-4" /> Upload File
          </button>
          <button
            onClick={() => {
              setActiveTab("retrieve");
              setUploadResult(null);
            }}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === "retrieve"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" /> Retrieve & Download File
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD FILE SECTION */}
      {activeTab === "upload" && (
        !uploadResult ? (
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? "border-purple-500 bg-purple-500/10 scale-[1.01]"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-slate-300 dark:border-slate-700 hover:border-purple-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt"
              />

              {!selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Drag & Drop file here or <span className="text-purple-600 dark:text-purple-400 underline">Browse</span>
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Supports JPG, PNG, WEBP, PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, ZIP, TXT (Max 50MB)
                  </p>
                  <Button type="button" className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
                    Browse Files
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="mb-3">{getFileIcon(selectedFile.type, selectedFile.name)}</div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white break-all max-w-md">{selectedFile.name}</h4>
                  <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 mt-1">{formatFileSize(selectedFile.size)}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Click or drag another file to replace</p>
                </div>
              )}
            </div>

            {/* UPLOADING PROGRESS BAR */}
            {isUploading && (
              <div className="space-y-2 bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-mono">
                  <span>Uploading {selectedFile?.name}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* OPTIONS SETTINGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              {/* Expiry Options */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-purple-500" /> Expiry Duration
                </Label>
                <Select value={expiryOption} onValueChange={setExpiryOption}>
                  <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Select expiry" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                    <SelectItem value="10m">10 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="24h">24 Hours (Default)</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="never">Never Expire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password Protection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Lock className="w-4 h-4 text-blue-500" /> Password Protection
                  </Label>
                  <Switch checked={enablePassword} onCheckedChange={setEnablePassword} />
                </div>
                {enablePassword && (
                  <Input
                    type="password"
                    placeholder="Enter access password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white mt-2"
                  />
                )}
              </div>

              {/* Self-Destruct Links */}
              <div className="space-y-2 md:col-span-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                      <Trash2 className="w-4 h-4 text-rose-500" /> Self-Destruct Mode
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Automatically delete file after download or view condition</p>
                  </div>
                  <Switch checked={selfDestruct} onCheckedChange={setSelfDestruct} />
                </div>

                {selfDestruct && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant={destructMode === "download" ? "default" : "outline"}
                      onClick={() => setDestructMode("download")}
                      className={destructMode === "download" ? "bg-rose-600 text-white" : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"}
                    >
                      Delete After 1st Download
                    </Button>
                    <Button
                      type="button"
                      variant={destructMode === "view" ? "default" : "outline"}
                      onClick={() => setDestructMode("view")}
                      className={destructMode === "view" ? "bg-rose-600 text-white" : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"}
                    >
                      Delete After 1st View
                    </Button>
                    <Button
                      type="button"
                      variant={destructMode === "time" ? "default" : "outline"}
                      onClick={() => setDestructMode("time")}
                      className={destructMode === "time" ? "bg-rose-600 text-white" : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"}
                    >
                      Time Expiry Only
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* UPLOAD SUBMIT BUTTON */}
            <Button
              onClick={handleStartUpload}
              disabled={!selectedFile || isUploading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              {isUploading ? "Uploading File..." : "Upload & Create Share Link"}
            </Button>
          </div>
        ) : (
          /* SUCCESS UPLOAD RESULT VIEW */
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <FileCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">File Uploaded Successfully!</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{uploadResult.originalName} ({formatFileSize(uploadResult.fileSize)})</p>
            </div>

            {/* SHARE CODE & LINK CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between">
                <span className="text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider">Share Code</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-3xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tracking-widest">{uploadResult.code}</span>
                  <Button
                    onClick={() => copyToClipboard(uploadResult.code, false)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col justify-between">
                <span className="text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider">Unique Share Link</span>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">{uploadResult.shareUrl}</span>
                  <Button
                    onClick={() => copyToClipboard(uploadResult.shareUrl, true)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
                  >
                    {copiedLink ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* FILE PREVIEW IF IMAGE */}
            {uploadResult.mimeType.startsWith("image/") && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Image Preview</p>
                <img
                  src={uploadResult.filePath}
                  alt={uploadResult.originalName}
                  className="max-h-56 mx-auto rounded-lg object-contain shadow"
                />
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Button
                onClick={() => triggerDeviceDownload(uploadResult.filePath, uploadResult.originalName, uploadResult.code)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                <Download className="w-4 h-4 mr-2" /> Download to Device
              </Button>

              <Button
                onClick={() => copyToClipboard(uploadResult.shareUrl, true)}
                variant="outline"
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>

              <Button
                onClick={() => {
                  setQrModalData({
                    url: uploadResult.shareUrl,
                    code: uploadResult.code,
                    title: `QR for ${uploadResult.originalName}`,
                  });
                  setShowQRModal(true);
                }}
                variant="outline"
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <QrCode className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" /> Show QR Code
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => handleShareEmail(uploadResult.originalName, uploadResult.shareUrl, uploadResult.code)}
                variant="outline"
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
              >
                Share via Email
              </Button>

              <Button
                onClick={() => {
                  setUploadResult(null);
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                Upload Another File
              </Button>
            </div>
          </div>
        )
      )}

      {/* TAB 2: RETRIEVE FILE SECTION */}
      {activeTab === "retrieve" && (
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Retrieve & Download File</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter a 6-digit numeric share code to access & download the file directly to your device</p>
            </div>
          </div>

          <form onSubmit={handleRetrieveSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-slate-700 dark:text-slate-300">Enter 6-Digit File Code</Label>
                <Input
                  placeholder="e.g. 849201"
                  value={retrieveCode}
                  onChange={(e) => setRetrieveCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center font-mono text-2xl tracking-widest bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-14 mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Password (If Protected)</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={retrievePassword}
                  onChange={(e) => setRetrievePassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-14 mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={retrieveQuery.isFetching}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              {retrieveQuery.isFetching ? "Searching File..." : "Retrieve & Download File to My Device"}
            </Button>
          </form>

          {/* RETRIEVAL RESULTS */}
          {queryCode && retrieveQuery.isFetching && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">Searching code {queryCode}...</p>
            </div>
          )}

          {queryCode && retrieveQuery.data && "error" in retrieveQuery.data && !retrieveQuery.isFetching && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-center text-rose-700 dark:text-rose-300 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-lg">{retrieveQuery.data.error}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Please double check the 6-digit code or enter the required password.</p>
            </div>
          )}

          {/* RETRIEVED FILE CARD */}
          {retrievedFile && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-600/20 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    {getFileIcon(retrievedFile.mimeType, retrievedFile.originalName)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white break-all">
                      {"originalName" in retrievedFile ? retrievedFile.originalName : "Shared File"}
                    </h3>
                    <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                      {"fileSize" in retrievedFile && typeof retrievedFile.fileSize === "number" ? formatFileSize(retrievedFile.fileSize) : ""}
                    </p>
                  </div>
                </div>

                {"filePath" in retrievedFile && retrievedFile.filePath && (
                  <Button
                    onClick={() => triggerDeviceDownload(retrievedFile.filePath!, retrievedFile.originalName || "downloaded_file", queryCode)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg"
                  >
                    <Download className="w-5 h-5 mr-2" /> Download File to Device
                  </Button>
                )}
              </div>

              {/* IMAGE PREVIEW */}
              {"mimeType" in retrievedFile && retrievedFile.mimeType?.startsWith("image/") && "filePath" in retrievedFile && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Image Preview</p>
                  <img
                    src={retrievedFile.filePath}
                    alt={retrievedFile.originalName}
                    className="max-h-72 mx-auto rounded-lg object-contain shadow"
                  />
                </div>
              )}

              {/* TEXT CONTENT PREVIEW IF TEXT SHARE */}
              {"isText" in retrievedFile && "content" in retrievedFile && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Retrieved Text Content</p>
                  <textarea
                    readOnly
                    value={retrievedFile.content}
                    rows={6}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-slate-900 dark:text-slate-100 font-mono text-sm"
                  />
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${queryCode}`;
                    copyToClipboard(shareUrl, true);
                  }}
                  variant="outline"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>

                <Button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/share/${queryCode}`;
                    setQrModalData({
                      url: shareUrl,
                      code: queryCode,
                      title: `QR Code (${queryCode})`,
                    });
                    setShowQRModal(true);
                  }}
                  variant="outline"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                >
                  <QrCode className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" /> View QR Code
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR MODAL */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title={qrModalData.title || "Share QR Code"}
        url={qrModalData.url}
        code={qrModalData.code}
      />
    </div>
  );
}
