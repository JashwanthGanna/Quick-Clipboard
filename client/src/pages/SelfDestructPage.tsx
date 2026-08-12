import { useState } from "react";
import {
  Flame,
  Trash2,
  Lock,
  Clock,
  Eye,
  Download,
  Copy,
  Check,
  QrCode,
  AlertTriangle,
  FileText,
  Upload,
  Search,
  Image as ImageIcon,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QRModal from "@/components/QRModal";

export default function SelfDestructPage() {
  const [activeTab, setActiveTab] = useState<"create" | "retrieve-text" | "retrieve-file">("create");

  // Create share states
  const [contentType, setContentType] = useState<"text" | "file">("text");
  const [textValue, setTextValue] = useState("");
  const [destructMode, setDestructMode] = useState<"view" | "download" | "time">("view");
  const [expiryOption, setExpiryOption] = useState<string>("24h");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [createdShare, setCreatedShare] = useState<{
    code: string;
    shareUrl: string;
    destructMode: string;
  } | null>(null);

  // Retrieve Text states
  const [retrieveTextCode, setRetrieveTextCode] = useState("");
  const [retrieveTextPassword, setRetrieveTextPassword] = useState("");
  const [queryTextCode, setQueryTextCode] = useState("");
  const [queryTextPassword, setQueryTextPassword] = useState("");
  const [copiedText, setCopiedText] = useState(false);

  // Retrieve File states
  const [retrieveFileCode, setRetrieveFileCode] = useState("");
  const [retrieveFilePassword, setRetrieveFilePassword] = useState("");
  const [queryFileCode, setQueryFileCode] = useState("");
  const [queryFilePassword, setQueryFilePassword] = useState("");

  // Modals & Copy
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ url: string; code?: string; title?: string }>({ url: "" });

  const sendTextMutation = trpc.clipboard.send.useMutation({
    onSuccess: (data) => {
      setCreatedShare({
        code: data.code,
        shareUrl: `${window.location.origin}/share/${data.code}`,
        destructMode,
      });
      toast.success("Self-destruct link created!");
    },
    onError: (err) => toast.error(err.message || "Failed to create share"),
  });

  const uploadFileMutation = trpc.file.upload.useMutation({
    onSuccess: (data) => {
      setCreatedShare({
        code: data.code,
        shareUrl: `${window.location.origin}/share/${data.code}`,
        destructMode,
      });
      toast.success("Self-destruct file link created!");
    },
    onError: (err) => toast.error(err.message || "Failed to upload file"),
  });

  const textQuery = trpc.clipboard.retrieve.useQuery(
    { code: queryTextCode, password: queryTextPassword || undefined },
    { enabled: Boolean(queryTextCode && queryTextCode.length === 6), retry: false }
  );

  const fileQuery = trpc.file.retrieve.useQuery(
    { code: queryFileCode, password: queryFilePassword || undefined },
    { enabled: Boolean(queryFileCode && queryFileCode.length === 6), retry: false }
  );

  const registerDownloadMutation = trpc.file.registerDownload.useMutation();

  const handleCreateSubmit = () => {
    if (contentType === "text") {
      if (!textValue.trim()) {
        toast.error("Please enter text content");
        return;
      }
      sendTextMutation.mutate({
        content: textValue,
        selfDestruct: true,
        destructMode,
        password: enablePassword ? password : undefined,
        expiryOption: expiryOption as any,
      });
    } else {
      if (!selectedFile) {
        toast.error("Please select a file to upload");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        uploadFileMutation.mutate({
          filename: selectedFile.name,
          mimeType: selectedFile.type || "application/octet-stream",
          fileSize: selectedFile.size,
          base64Data: reader.result as string,
          password: enablePassword ? password : undefined,
          selfDestruct: true,
          destructMode,
          expiryOption: expiryOption as any,
        });
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRetrieveTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = retrieveTextCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast.error("Please enter a valid 6-digit numeric code.");
      return;
    }
    setQueryTextCode(cleanCode);
    setQueryTextPassword(retrieveTextPassword);
  };

  const handleRetrieveFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = retrieveFileCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast.error("Please enter a valid 6-digit numeric code.");
      return;
    }
    setQueryFileCode(cleanCode);
    setQueryFilePassword(retrieveFilePassword);
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
      toast.success(isLink ? "Copied share link!" : "Copied share code!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const retrievedTextData = textQuery.data && !("error" in textQuery.data) && !textQuery.data.requiresPassword ? textQuery.data : null;
  const retrievedFileData = fileQuery.data && !("error" in fileQuery.data) && !fileQuery.data.requiresPassword ? fileQuery.data : null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-slate-900 dark:text-white transition-colors duration-300">
      {/* HEADER */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium mb-3">
          <Flame className="w-4 h-4" /> Self-Destruct Engine
        </div>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-rose-600 via-purple-600 to-blue-600 dark:from-rose-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
          Temporary Secure Shares
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto">
          Share or retrieve sensitive information and files that permanently erase after viewing or downloading.
        </p>
      </div>

      {/* TOP TAB SWITCHER: CREATE vs RETRIEVE TEXT vs RETRIEVE FILE */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1.5 bg-slate-200 dark:bg-slate-900/90 border border-slate-300 dark:border-white/10 rounded-2xl shadow-inner max-w-xl w-full">
          <button
            onClick={() => {
              setActiveTab("create");
              setCreatedShare(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === "create"
                ? "bg-rose-600 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Flame className="w-4 h-4" /> Create Share
          </button>
          <button
            onClick={() => {
              setActiveTab("retrieve-text");
              setQueryTextCode("");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === "retrieve-text"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" /> Retrieve Text
          </button>
          <button
            onClick={() => {
              setActiveTab("retrieve-file");
              setQueryFileCode("");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === "retrieve-file"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" /> Retrieve File
          </button>
        </div>
      </div>

      {/* WARNING BANNER */}
      <div className="mb-6 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-500/40 rounded-xl p-4 flex items-center gap-3 text-amber-900 dark:text-amber-200 shadow-md">
        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm font-medium">
          "This content will permanently disappear after the selected self-destruct condition is met."
        </p>
      </div>

      {/* TAB 1: CREATE SELF-DESTRUCT SHARE */}
      {activeTab === "create" && (
        !createdShare ? (
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
            {/* TYPE TOGGLE */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-white/10">
              <Button
                type="button"
                variant={contentType === "text" ? "default" : "ghost"}
                onClick={() => setContentType("text")}
                className={contentType === "text" ? "bg-purple-600 text-white font-bold" : "text-slate-600 dark:text-slate-400"}
              >
                <FileText className="w-4 h-4 mr-2" /> Text Clipboard
              </Button>
              <Button
                type="button"
                variant={contentType === "file" ? "default" : "ghost"}
                onClick={() => setContentType("file")}
                className={contentType === "file" ? "bg-purple-600 text-white font-bold" : "text-slate-600 dark:text-slate-400"}
              >
                <Upload className="w-4 h-4 mr-2" /> File Upload
              </Button>
            </div>

            {/* CONTENT INPUT */}
            {contentType === "text" ? (
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Sensitive Text Content</Label>
                <textarea
                  rows={6}
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Paste confidential text, tokens, or credentials here..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">Select Confidential File (Max 50MB)</Label>
                <Input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-12 pt-2"
                />
                {selectedFile && (
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-1">Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>
                )}
              </div>
            )}

            {/* DESTRUCT CONDITION MODES */}
            <div className="space-y-3 pt-2">
              <Label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" /> Select Destruction Condition
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => setDestructMode("view")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    destructMode === "view"
                      ? "border-rose-500 bg-rose-500/10 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Eye className="w-4 h-4 text-rose-500" /> Delete 1st View
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Erases immediately after recipient views content once.</p>
                </div>

                <div
                  onClick={() => setDestructMode("download")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    destructMode === "download"
                      ? "border-rose-500 bg-rose-500/10 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Download className="w-4 h-4 text-rose-500" /> Delete 1st Download
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Erases immediately after recipient downloads file.</p>
                </div>

                <div
                  onClick={() => setDestructMode("time")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    destructMode === "time"
                      ? "border-rose-500 bg-rose-500/10 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Clock className="w-4 h-4 text-rose-500" /> Time Expiry Only
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Erases automatically when the timer reaches zero.</p>
                </div>
              </div>
            </div>

            {/* EXPIRY & PASSWORD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Time Limit</Label>
                <Select value={expiryOption} onValueChange={setExpiryOption}>
                  <SelectTrigger className="bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Select expiry" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="10m">10 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 dark:text-slate-300">Password Lock</Label>
                  <Switch checked={enablePassword} onCheckedChange={setEnablePassword} />
                </div>
                {enablePassword && (
                  <Input
                    type="password"
                    placeholder="Set unlock password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white mt-1"
                  />
                )}
              </div>
            </div>

            <Button
              onClick={handleCreateSubmit}
              disabled={sendTextMutation.isPending || uploadFileMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-rose-600 via-purple-600 to-blue-600 hover:from-rose-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              Create Self-Destruct Share Link
            </Button>
          </div>
        ) : (
          /* CREATED RESULT CARD */
          <div className="bg-white dark:bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-3">
                <Flame className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Self-Destruct Share Ready</h2>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 font-mono uppercase">Destruct Condition: {createdShare.destructMode}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Share Code</span>
                  <p className="text-3xl font-mono font-extrabold text-rose-600 dark:text-rose-400">{createdShare.code}</p>
                </div>
                <Button onClick={() => copyToClipboard(createdShare.code, false)} variant="ghost" className="text-slate-600 dark:text-slate-300">
                  {copiedCode ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="truncate pr-2">
                  <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Share Link</span>
                  <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate">{createdShare.shareUrl}</p>
                </div>
                <Button onClick={() => copyToClipboard(createdShare.shareUrl, true)} variant="ghost" className="text-slate-600 dark:text-slate-300 shrink-0">
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => copyToClipboard(createdShare.shareUrl, true)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>
              <Button
                onClick={() => {
                  setQrModalData({
                    url: createdShare.shareUrl,
                    code: createdShare.code,
                    title: `Self-Destruct QR (${createdShare.code})`,
                  });
                  setShowQRModal(true);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                <QrCode className="w-4 h-4 mr-2" /> Show QR Code
              </Button>
            </div>

            <Button
              onClick={() => {
                setCreatedShare(null);
                setTextValue("");
                setSelectedFile(null);
              }}
              variant="outline"
              className="w-full bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Create Another Secure Share
            </Button>
          </div>
        )
      )}

      {/* TAB 2: RETRIEVE SELF-DESTRUCT TEXT */}
      {activeTab === "retrieve-text" && (
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Retrieve Self-Destruct Text</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter a 6-digit numeric code to view confidential text before it self-destructs</p>
            </div>
          </div>

          <form onSubmit={handleRetrieveTextSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-slate-700 dark:text-slate-300">Enter 6-Digit Text Code</Label>
                <Input
                  placeholder="e.g. 123456"
                  value={retrieveTextCode}
                  onChange={(e) => setRetrieveTextCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center font-mono text-2xl tracking-widest bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-14 mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Password (If Locked)</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={retrieveTextPassword}
                  onChange={(e) => setRetrieveTextPassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-14 mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={textQuery.isFetching}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              {textQuery.isFetching ? "Retrieving Text..." : "Retrieve & View Text Content"}
            </Button>
          </form>

          {queryTextCode && textQuery.isFetching && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">Searching code {queryTextCode}...</p>
            </div>
          )}

          {queryTextCode && textQuery.data && "error" in textQuery.data && !textQuery.isFetching && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-center text-rose-700 dark:text-rose-300 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-lg">{textQuery.data.error}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Please verify the code or check if it has already self-destructed.</p>
            </div>
          )}

          {retrievedTextData && "content" in retrievedTextData && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-purple-300 dark:border-purple-500/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono text-purple-700 dark:text-purple-300 font-bold">Retrieved Confidential Text</span>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(retrievedTextData.content || "");
                    setCopiedText(true);
                    toast.success("Text copied!");
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  size="sm"
                  variant="outline"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                >
                  {copiedText ? <Check className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copiedText ? "Copied!" : "Copy Text"}
                </Button>
              </div>

              <textarea
                readOnly
                value={retrievedTextData.content || ""}
                rows={8}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-slate-100 font-mono text-base focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RETRIEVE SELF-DESTRUCT FILE */}
      {activeTab === "retrieve-file" && (
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Retrieve Self-Destruct File</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Enter a 6-digit numeric code to download confidential file straight to your local device</p>
            </div>
          </div>

          <form onSubmit={handleRetrieveFileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-slate-700 dark:text-slate-300">Enter 6-Digit File Code</Label>
                <Input
                  placeholder="e.g. 849201"
                  value={retrieveFileCode}
                  onChange={(e) => setRetrieveFileCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center font-mono text-2xl tracking-widest bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-14 mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Password (If Locked)</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={retrieveFilePassword}
                  onChange={(e) => setRetrieveFilePassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white h-14 mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={fileQuery.isFetching}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-rose-600 hover:from-blue-500 hover:to-rose-500 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              {fileQuery.isFetching ? "Searching File..." : "Retrieve & Download File to My Device"}
            </Button>
          </form>

          {queryFileCode && fileQuery.isFetching && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">Searching code {queryFileCode}...</p>
            </div>
          )}

          {queryFileCode && fileQuery.data && "error" in fileQuery.data && !fileQuery.isFetching && (
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-center text-rose-700 dark:text-rose-300 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="font-semibold text-lg">{fileQuery.data.error}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Please verify the code or check if the file has already self-destructed.</p>
            </div>
          )}

          {retrievedFileData && "filePath" in retrievedFileData && retrievedFileData.filePath && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-blue-300 dark:border-blue-500/40 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-600/20 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <FileCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white break-all">
                      {retrievedFileData.originalName || "Self-Destruct File"}
                    </h3>
                    <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                      {retrievedFileData.fileSize ? formatFileSize(retrievedFileData.fileSize) : ""}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => triggerDeviceDownload(retrievedFileData.filePath!, retrievedFileData.originalName || "downloaded_file", queryFileCode)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg"
                >
                  <Download className="w-5 h-5 mr-2" /> Download File to Device
                </Button>
              </div>

              {/* IMAGE PREVIEW */}
              {retrievedFileData.mimeType && retrievedFileData.mimeType.startsWith("image/") && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Image Preview</p>
                  <img
                    src={retrievedFileData.filePath}
                    alt={retrievedFileData.originalName || "Preview"}
                    className="max-h-72 mx-auto rounded-lg object-contain shadow"
                  />
                </div>
              )}
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
