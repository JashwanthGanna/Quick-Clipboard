import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import {
  getRoomByCode,
  updateRoomClipboard,
  updateRoomNotes,
  updateRoomLock,
  deleteRoom,
  regenerateRoomCode,
} from "./db";

interface RoomMember {
  socketId: string;
  name: string;
  isOwner: boolean;
  joinedAt: Date;
}

// Map roomCode -> Set of Socket IDs
const roomSocketsMap = new Map<string, Map<string, RoomMember>>();

export function setupSocketIO(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let currentMemberName: string = "Guest";

    // JOIN ROOM
    socket.on("join_room", async (data: { roomCode: string; password?: string; name?: string; ownerToken?: string }) => {
      const { roomCode, password, name, ownerToken } = data;
      const cleanCode = roomCode.toUpperCase().trim();

      const room = await getRoomByCode(cleanCode);
      if (!room) {
        socket.emit("room_error", { message: "Room not found or has expired." });
        return;
      }

      if (room.isLocked && room.ownerToken !== ownerToken) {
        socket.emit("room_error", { message: "This room is currently locked by the owner." });
        return;
      }

      if (room.password && room.password !== password && room.ownerToken !== ownerToken) {
        socket.emit("room_error", { message: "Incorrect password for this room." });
        return;
      }

      // Leave previous room if any
      if (currentRoomCode) {
        socket.leave(currentRoomCode);
        removeMember(currentRoomCode, socket.id, io);
      }

      currentRoomCode = cleanCode;
      currentMemberName = name?.trim() || `User_${Math.floor(1000 + Math.random() * 9000)}`;
      const isOwner = room.ownerToken === ownerToken;

      socket.join(cleanCode);

      // Add to member tracking
      if (!roomSocketsMap.has(cleanCode)) {
        roomSocketsMap.set(cleanCode, new Map());
      }
      const membersMap = roomSocketsMap.get(cleanCode)!;
      const memberInfo: RoomMember = {
        socketId: socket.id,
        name: currentMemberName,
        isOwner,
        joinedAt: new Date(),
      };
      membersMap.set(socket.id, memberInfo);

      // Send initial room state to joining member
      socket.emit("room_joined", {
        roomCode: cleanCode,
        name: room.name,
        clipboardText: room.clipboardText,
        notes: room.notes,
        isLocked: Boolean(room.isLocked),
        isOwner,
        expiresAt: room.expiresAt,
        members: Array.from(membersMap.values()),
      });

      // Broadcast updated member list to room
      io.to(cleanCode).emit("room_members_update", {
        count: membersMap.size,
        members: Array.from(membersMap.values()),
      });
    });

    // UPDATE CLIPBOARD
    socket.on("update_clipboard", async (data: { roomCode: string; text: string }) => {
      const { roomCode, text } = data;
      await updateRoomClipboard(roomCode, text);
      socket.to(roomCode).emit("clipboard_updated", { text, sender: currentMemberName });
    });

    // UPDATE NOTES
    socket.on("update_notes", async (data: { roomCode: string; notes: string }) => {
      const { roomCode, notes } = data;
      await updateRoomNotes(roomCode, notes);
      socket.to(roomCode).emit("notes_updated", { notes, sender: currentMemberName });
    });

    // OWNER ACTIONS: LOCK ROOM
    socket.on("lock_room", async (data: { roomCode: string; isLocked: boolean }) => {
      const { roomCode, isLocked } = data;
      await updateRoomLock(roomCode, isLocked);
      io.to(roomCode).emit("room_lock_changed", { isLocked });
    });

    // OWNER ACTIONS: KICK MEMBER
    socket.on("kick_member", (data: { roomCode: string; targetSocketId: string }) => {
      const { roomCode, targetSocketId } = data;
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("kicked_from_room", { message: "You were kicked from the room by the owner." });
        targetSocket.leave(roomCode);
        removeMember(roomCode, targetSocketId, io);
      }
    });

    // OWNER ACTIONS: REGENERATE LINK
    socket.on("regenerate_code", async (data: { roomCode: string }) => {
      const { roomCode } = data;
      try {
        const newCode = await regenerateRoomCode(roomCode);
        io.to(roomCode).emit("room_code_regenerated", { newCode });
      } catch (err: any) {
        socket.emit("room_error", { message: err.message || "Failed to regenerate room code." });
      }
    });

    // OWNER ACTIONS: DELETE ROOM
    socket.on("delete_room", async (data: { roomCode: string }) => {
      const { roomCode } = data;
      await deleteRoom(roomCode);
      io.to(roomCode).emit("room_deleted", { message: "This room was closed and deleted by the owner." });
      io.in(roomCode).socketsLeave(roomCode);
      roomSocketsMap.delete(roomCode);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      if (currentRoomCode) {
        removeMember(currentRoomCode, socket.id, io);
      }
    });
  });

  return io;
}

function removeMember(roomCode: string, socketId: string, io: Server) {
  const membersMap = roomSocketsMap.get(roomCode);
  if (membersMap) {
    membersMap.delete(socketId);
    if (membersMap.size === 0) {
      roomSocketsMap.delete(roomCode);
    } else {
      io.to(roomCode).emit("room_members_update", {
        count: membersMap.size,
        members: Array.from(membersMap.values()),
      });
    }
  }
}
