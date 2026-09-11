import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import {
  Users,
  Plus,
  LogIn,
  Copy,
  Check,
  Lock,
  Unlock,
  Shield,
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QRModal from "@/components/QRModal";

interface RoomMember {
  socketId: string;
  name: string;
  isOwner: boolean;
  joinedAt: string;
}

export default function SharedRooms() {
  const [, params] = useRoute("/room/:code");
  const initialCode = (params?.code || "").toUpperCase();
  const [, setLocation] = useLocation();

  const [roomCode, setRoomCode] = useState(initialCode);
  const [joinCodeInput, setJoinCodeInput] = useState(initialCode);
  const [joinPassword, setJoinPassword] = useState("");
  const [userName, setUserName] = useState("");

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPassword, setNewRoomPassword] = useState("");
  const [newRoomExpiry, setNewRoomExpiry] = useState("24h");

  const [inRoom, setInRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [clipboardText, setClipboardText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string>("");

  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const deletedCountRef = useRef(0);
  const roomCodeRef = useRef(roomCode);
  const userNameRef = useRef(userName);
  const ownerTokenRef = useRef(ownerToken);
  const clipboardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notesTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { ownerTokenRef.current = ownerToken; }, [ownerToken]);

  const createRoomMutation = trpc.room.create.useMutation();
  const joinRoomMutation = trpc.room.join.useMutation();
  const updateClipboardMutation = trpc.room.updateClipboard.useMutation();
  const updateNotesMutation = trpc.room.updateNotes.useMutation();
  const toggleLockMutation = trpc.room.toggleLock.useMutation();
  const regenerateCodeMutation = trpc.room.regenerateCode.useMutation();
  const deleteRoomMutation = trpc.room.deleteRoom.useMutation();
  const uploadRoomFileMutation = trpc.room.uploadFile.useMutation();

  const roomFilesQuery = trpc.room.getFiles.useQuery(
    { roomCode },
    { enabled: Boolean(inRoom && roomCode) }
  );

  // Poll room sync state every 1.5s when inside a room for production Vercel compatibility
  const syncQuery = trpc.room.getSync.useQuery(
    { code: roomCode, ownerToken },
    {
      enabled: Boolean(inRoom && roomCode && roomCode.length === 6 && ownerToken),
      refetchInterval: 1500,
    }
  );

  useEffect(() => {
    let token = localStorage.getItem("qc_owner_token");
    if (!token) {
      token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("qc_owner_token", token);
    }
    setOwnerToken(token);
  }, []);

  // Auxiliary Socket.IO setup for local dev / optional socket server
  useEffect(() => {
    try {
      const socketHost = import.meta.env.VITE_API_URL || window.location.origin;
      const socket = io(socketHost, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        autoConnect: false,
      });
      socket.connect();
      socketRef.current = socket;

      socket.on("connect", () => {
        if (roomCodeRef.current) {
          socket.emit("join_room", {
            roomCode: roomCodeRef.current,
            name: userNameRef.current || "Member",
            ownerToken: ownerTokenRef.current,
          });
        }
      });

      socket.on("room_joined", (data: any) => {
        setInRoom(true);
        if (data.name) setRoomName(data.name);
        if (data.clipboardText !== undefined) setClipboardText(data.clipboardText || "");
        if (data.notes !== undefined) setNotesText(data.notes || "");
        if (data.isLocked !== undefined) setIsLocked(data.isLocked);
        if (data.isOwner !== undefined) setIsOwner(data.isOwner);
        if (data.members) setMembers(data.members || []);
      });

      socket.on("room_members_update", (data: any) => {
        setMembers(data.members || []);
      });

      socket.on("clipboard_updated", (data: any) => {
        const activeEl = document.activeElement;
        if (activeEl?.id !== "clipboard-textarea") {
          setClipboardText(data.text);
        }
      });

      socket.on("notes_updated", (data: any) => {
        const activeEl = document.activeElement;
        if (activeEl?.id !== "notes-textarea") {
          setNotesText(data.notes);
        }
      });

      socket.on("room_lock_changed", (data: any) => {
        setIsLocked(data.isLocked);
        toast.info(data.isLocked ? "Room was locked by owner." : "Room was unlocked.");
      });

      socket.on("room_code_regenerated", (data: any) => {
        setRoomCode(data.newCode);
        setLocation(`/room/${data.newCode}`);
        toast.info(`Room link regenerated: Code is now ${data.newCode}`);
      });

      socket.on("kicked_from_room", (data: any) => {
        toast.error(data.message || "You were kicked from the room.");
        setInRoom(false);
        setLocation("/rooms");
      });

      socket.on("room_deleted", (data: any) => {
        toast.warning(data.message || "Room was deleted.");
        setInRoom(false);
        setLocation("/rooms");
      });

      return () => {
        socket.disconnect();
      };
    } catch (e) {
      console.warn("Socket initialization skipped:", e);
    }
  }, [setLocation]);

  // Handle room polling updates (MySQL source of truth)
  useEffect(() => {
    if (!inRoom || !syncQuery.data) return;
    const data = syncQuery.data;

    if (data.isDeleted) {
      deletedCountRef.current += 1;
      if (deletedCountRef.current >= 5) {
        toast.warning("Room was deleted or has expired.");
        setInRoom(false);
        setLocation("/rooms");
      }
      return;
    }

    deletedCountRef.current = 0;

    setIsLocked(Boolean(data.isLocked));
    setIsOwner(Boolean(data.isOwner));
    if (data.name) setRoomName(data.name);

    const activeEl = document.activeElement;
    if (activeEl?.id !== "clipboard-textarea" && data.clipboardText !== undefined) {
      setClipboardText(data.clipboardText);
    }
    if (activeEl?.id !== "notes-textarea" && data.notes !== undefined) {
      setNotesText(data.notes);
    }
  }, [syncQuery.data, inRoom, setLocation]);

  // Auto-join room if navigating directly to /room/:code
  useEffect(() => {
    if (initialCode && ownerToken && !inRoom && !joinRoomMutation.isPending) {
      setJoinCodeInput(initialCode);
      setRoomCode(initialCode);
      joinRoomMutation
        .mutateAsync({
          code: initialCode,
          ownerToken,
        })
        .then((res) => {
          setInRoom(true);
          setIsOwner(res.room.isOwner);
          setIsLocked(res.room.isLocked);
          setRoomName(res.room.name);
          setClipboardText(res.room.clipboardText || "");
          setNotesText(res.room.notes || "");
          toast.success(`Joined room "${res.room.name}"`);

          socketRef.current?.emit("join_room", {
            roomCode: res.room.code,
            name: userName || "Member",
            ownerToken,
          });
        })
        .catch(() => {
          // If password required, user can enter password on the join form
        });
    }
  }, [initialCode, ownerToken, inRoom]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      toast.error("Please enter room name.");
      return;
    }

    try {
      const res = await createRoomMutation.mutateAsync({
        name: newRoomName,
        password: newRoomPassword || undefined,
        expiryOption: newRoomExpiry as any,
        ownerToken,
      });

      setRoomCode(res.code);
      setInRoom(true);
      setIsOwner(true);
      setIsLocked(false);
      setRoomName(res.room.name || newRoomName);
      setClipboardText(res.room.clipboardText || "");
      setNotesText(res.room.notes || "");
      setLocation(`/room/${res.code}`);
      toast.success(`Created room "${res.room.name || newRoomName}"`);

      socketRef.current?.emit("join_room", {
        roomCode: res.code,
        password: newRoomPassword,
        name: userName || "Owner",
        ownerToken,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create room.");
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      toast.error("Please enter 6-digit room code.");
      return;
    }
    const cleanCode = joinCodeInput.trim().toUpperCase();

    try {
      const res = await joinRoomMutation.mutateAsync({
        code: cleanCode,
        password: joinPassword || undefined,
        name: userName || "Member",
        ownerToken,
      });

      setRoomCode(res.room.code);
      setInRoom(true);
      setIsOwner(res.room.isOwner);
      setIsLocked(res.room.isLocked);
      setRoomName(res.room.name);
      setClipboardText(res.room.clipboardText || "");
      setNotesText(res.room.notes || "");
      setLocation(`/room/${res.room.code}`);
      toast.success(`Joined room "${res.room.name}"`);

      socketRef.current?.emit("join_room", {
        roomCode: res.room.code,
        password: joinPassword,
        name: userName || "Member",
        ownerToken,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to join room.");
    }
  };

  const handleClipboardChange = (val: string) => {
    setClipboardText(val);
    const code = roomCodeRef.current;
    if (code) {
      socketRef.current?.emit("update_clipboard", { roomCode: code, text: val });
      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
      clipboardTimerRef.current = setTimeout(() => {
        updateClipboardMutation.mutate({ code, text: val });
      }, 500);
    }
  };

  const handleNotesChange = (val: string) => {
    setNotesText(val);
    const code = roomCodeRef.current;
    if (code) {
      socketRef.current?.emit("update_notes", { roomCode: code, notes: val });
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(() => {
        updateNotesMutation.mutate({ code, notes: val });
      }, 500);
    }
  };

  const handleToggleLock = async () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    try {
      await toggleLockMutation.mutateAsync({ code: roomCode, isLocked: nextLocked, ownerToken });
      toast.info(nextLocked ? "Room was locked by owner." : "Room was unlocked.");
      socketRef.current?.emit("lock_room", { roomCode, isLocked: nextLocked });
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle room lock.");
      setIsLocked(!nextLocked);
    }
  };

  const handleKickMember = (targetSocketId: string) => {
    socketRef.current?.emit("kick_member", { roomCode, targetSocketId });
  };

  const handleRegenerateCode = async () => {
    try {
      const res = await regenerateCodeMutation.mutateAsync({ code: roomCode, ownerToken });
      setRoomCode(res.newCode);
      setLocation(`/room/${res.newCode}`);
      toast.info(`Room link regenerated: Code is now ${res.newCode}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate room code.");
    }
  };

  const handleDeleteRoom = async () => {
    if (confirm("Are you sure you want to delete this room? All members will be disconnected.")) {
      try {
        await deleteRoomMutation.mutateAsync({ code: roomCode, ownerToken });
        toast.warning("Room was deleted.");
        setInRoom(false);
        setLocation("/rooms");
        socketRef.current?.emit("delete_room", { roomCode });
      } catch (err: any) {
        toast.error(err.message || "Failed to delete room.");
      }
    }
  };

  const handleUploadRoomFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await uploadRoomFileMutation.mutateAsync({
          roomCode,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          base64Data: reader.result as string,
        });
        toast.success("File added to room feed!");
        roomFilesQuery.refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to upload file to room.");
      }
    };
    reader.readAsDataURL(file);
  };

  const shareUrl = `${window.location.origin}/room/${roomCode}`;

  const copyToClipboard = async (text: string, isLink: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Copied room link!");
    } catch {
      toast.error("Copy failed.");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-slate-900 dark:text-white transition-colors duration-300">
      {/* HEADER */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-sm font-medium mb-3">
          <Users className="w-4 h-4" /> Live Collaboration Hub
        </div>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Real-Time Shared Rooms
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto">
          Collaborate instantly with live clipboard sync, shared notes, file uploads, and member management.
        </p>
      </div>

      {!inRoom ? (
        /* LOBBY: CREATE OR JOIN */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* JOIN ROOM CARD */}
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Join Existing Room</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enter room code & join instantly</p>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Room Code (6 Digits)</Label>
                <Input
                  placeholder="e.g. 849201"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  maxLength={6}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-center text-xl tracking-widest uppercase h-12 mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Your Display Name (Optional)</Label>
                <Input
                  placeholder="e.g. Alex"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Room Password (If protected)</Label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white mt-1"
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl shadow-md">
                Join Room
              </Button>
            </form>
          </div>

          {/* CREATE ROOM CARD */}
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Room</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Generate temporary collaboration space</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300">Room Name</Label>
                <Input
                  placeholder="e.g. Project Team, Marketing Sprint"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Room Expiry</Label>
                <Select value={newRoomExpiry} onValueChange={setNewRoomExpiry}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white mt-1">
                    <SelectValue placeholder="Expiry" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="10m">10 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="24h">24 Hours (Default)</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="never">Never Expire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700 dark:text-slate-300">Optional Password</Label>
                <Input
                  type="password"
                  placeholder="Set room password"
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white mt-1"
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-lg rounded-xl shadow-lg">
                Create Room Now
              </Button>
            </form>
          </div>
        </div>
      ) : (
        /* INSIDE LIVE ROOM */
        <div className="space-y-6">
          {/* ROOM TOP HEADER */}
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{roomName}</h2>
                <span className="text-xs font-mono bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 px-2.5 py-1 rounded-md">
                  CODE: {roomCode}
                </span>
                {isLocked && (
                  <span className="text-xs bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 px-2.5 py-1 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
                {isOwner && (
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Owner
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Live collaborative clipboard and notes scratchpad</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => copyToClipboard(shareUrl, true)} variant="outline" size="sm" className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white">
                {copiedLink ? <Check className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
                Copy Link
              </Button>
              <Button onClick={() => setShowQRModal(true)} variant="outline" size="sm" className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white">
                <QrCode className="w-4 h-4 mr-1 text-purple-600 dark:text-purple-400" /> Room QR
              </Button>
              <Button onClick={() => setInRoom(false)} variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                Leave Room
              </Button>
            </div>
          </div>

          {/* MAIN ROOM CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 2 COLUMNS: CLIPBOARD & NOTES */}
            <div className="lg:col-span-2 space-y-6">
              {/* SHARED TEXT CLIPBOARD */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Shared Text Clipboard
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Live Sync</span>
                </div>
                <textarea
                  id="clipboard-textarea"
                  rows={8}
                  value={clipboardText}
                  onChange={(e) => handleClipboardChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.target as HTMLTextAreaElement).select();
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="Type or paste shared content here..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* SHARED NOTES SCRATCHPAD */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Shared Notes Scratchpad
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Collaborative Notes</span>
                </div>
                <textarea
                  id="notes-textarea"
                  rows={6}
                  value={notesText}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.target as HTMLTextAreaElement).select();
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="Add meeting notes, ideas, or key-value snippets..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-4 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* ROOM FILES FEED */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Room Files Feed
                  </h3>
                  <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                    <Plus className="w-4 h-4" /> Upload File
                    <input type="file" onChange={handleUploadRoomFile} className="hidden" />
                  </label>
                </div>

                <div className="space-y-2">
                  {roomFilesQuery.data && roomFilesQuery.data.length > 0 ? (
                    roomFilesQuery.data.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="truncate pr-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{file.originalName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{(file.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                        <a
                          href={file.filePath}
                          download={file.originalName}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs text-center py-4">No files uploaded to room feed yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MEMBERS & OWNER CONTROLS */}
            <div className="space-y-6">
              {/* MEMBER LIST */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Active Members
                  </h3>
                  <span className="text-xs font-mono bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    {members.length > 0 ? members.length : 1}
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {members.length > 0 ? (
                    members.map((m) => (
                      <div key={m.socketId} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{m.name}</span>
                          {m.isOwner && <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">Owner</span>}
                        </div>

                        {isOwner && !m.isOwner && (
                          <Button
                            onClick={() => handleKickMember(m.socketId)}
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-7 text-xs px-2"
                          >
                            Kick
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{userName || (isOwner ? "Owner" : "Member")}</span>
                        {isOwner && <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">Owner</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OWNER CONTROLS PANEL */}
              {isOwner && (
                <div className="bg-white dark:bg-slate-900/90 border border-purple-200 dark:border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Owner Controls
                  </h3>

                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={handleToggleLock}
                      variant="outline"
                      className="w-full justify-start bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isLocked ? <Unlock className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-4 h-4 mr-2 text-rose-600 dark:text-rose-400" />}
                      {isLocked ? "Unlock Room Joins" : "Lock Room Joins"}
                    </Button>

                    <Button
                      onClick={handleRegenerateCode}
                      variant="outline"
                      className="w-full justify-start bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" /> Regenerate Room Code
                    </Button>

                    <Button
                      onClick={handleDeleteRoom}
                      className="w-full justify-start bg-rose-100 dark:bg-rose-600/20 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Room Completely
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <QRModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            title={`Room QR (${roomCode})`}
            url={shareUrl}
            code={roomCode}
          />
        </div>
      )}
    </div>
  );
}
