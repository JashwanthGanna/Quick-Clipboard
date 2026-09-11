import { eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  clipboards,
  files,
  rooms,
  roomFiles,
  analyticsStats,
  contactSubmissions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

import type { Clipboard, SharedFile, SharedRoom, RoomFile } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

import fs from "fs";
import path from "path";
import os from "os";

// In-Memory Fallback Storage
type InMemoryClipboard = Clipboard & { content: string };
type InMemoryFile = SharedFile;
type InMemoryRoom = SharedRoom;
type InMemoryRoomFile = RoomFile;

const memoryClipboards = new Map<string, InMemoryClipboard>();
const memoryFiles = new Map<string, InMemoryFile>();
const memoryRooms = new Map<string, InMemoryRoom>();
const memoryRoomFiles = new Map<number, InMemoryRoomFile>();

let memoryClipboardIdCounter = 1;
let memoryFileIdCounter = 1;
let memoryRoomIdCounter = 1;
let memoryRoomFileIdCounter = 1;

const TEMP_STORAGE_FILE = path.join(os.tmpdir(), "qc_storage_cache.json");

function loadTempStorage() {
  try {
    if (fs.existsSync(TEMP_STORAGE_FILE)) {
      const raw = fs.readFileSync(TEMP_STORAGE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (data && data.clipboards) {
        Object.entries(data.clipboards).forEach(([code, item]: [string, any]) => {
          memoryClipboards.set(code, item);
        });
      }
      if (data && data.files) {
        Object.entries(data.files).forEach(([code, item]: [string, any]) => {
          memoryFiles.set(code, item);
        });
      }
      if (data && data.rooms) {
        Object.entries(data.rooms).forEach(([code, item]: [string, any]) => {
          memoryRooms.set(code, item);
        });
      }
      if (data && data.roomFiles) {
        Object.entries(data.roomFiles).forEach(([idStr, item]: [string, any]) => {
          memoryRoomFiles.set(Number(idStr), item);
        });
      }
    }
  } catch (err) {
    // Ignore read errors
  }
}

function saveTempStorage() {
  try {
    const data = {
      clipboards: Object.fromEntries(memoryClipboards),
      files: Object.fromEntries(memoryFiles),
      rooms: Object.fromEntries(memoryRooms),
      roomFiles: Object.fromEntries(memoryRoomFiles),
    };
    fs.writeFileSync(TEMP_STORAGE_FILE, JSON.stringify(data), "utf-8");
  } catch (err) {
    // Ignore write errors
  }
}

// Automatically load cached temp storage on module initialization
loadTempStorage();

const globalStats = {
  filesSharedCount: 142,
  textSharesCount: 389,
  qrGeneratedCount: 512,
  ocrConversionsCount: 94,
  roomsCreatedCount: 47,
};

export function parseExpiryOption(expiry: string): Date | null {
  const now = Date.now();
  switch (expiry) {
    case "10m":
      return new Date(now + 10 * 60 * 1000);
    case "1h":
      return new Date(now + 60 * 60 * 1000);
    case "24h":
      return new Date(now + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case "never":
      return null;
    default:
      return new Date(now + 24 * 60 * 60 * 1000);
  }
}

function generateNumericCode(length = 6): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// CLIPBOARDS / TEXT SHARING
export async function createClipboard(options: {
  content: string;
  selfDestruct?: boolean;
  destructMode?: "view" | "download" | "time" | "none";
  password?: string;
  maxViews?: number;
  maxDownloads?: number;
  expiryOption?: string;
}): Promise<string> {
  const expiresAt = parseExpiryOption(options.expiryOption || "24h");
  const selfDestruct = options.selfDestruct ? 1 : 0;
  const destructMode = options.destructMode || (selfDestruct ? "view" : "none");

  loadTempStorage();

  let code: string;
  let attempts = 0;

  try {
    const db = await getDb();
    if (db) {
      let isUnique = false;
      do {
        code = generateNumericCode(6);
        const existing = await db.select().from(clipboards).where(eq(clipboards.code, code)).limit(1);
        isUnique = existing.length === 0;
        attempts++;
      } while (!isUnique && attempts < 100);

      if (isUnique) {
        await db.insert(clipboards).values({
          code,
          content: options.content,
          selfDestruct,
          destructMode,
          password: options.password || null,
          viewCount: 0,
          maxViews: options.maxViews || (destructMode === "view" ? 1 : null),
          downloadCount: 0,
          maxDownloads: options.maxDownloads || null,
          viewed: 0,
          expiresAt: expiresAt as any,
        });

        const item: InMemoryClipboard = {
          id: memoryClipboardIdCounter++,
          code,
          content: options.content,
          selfDestruct,
          destructMode,
          password: options.password || null,
          viewCount: 0,
          maxViews: options.maxViews || (destructMode === "view" ? 1 : null),
          downloadCount: 0,
          maxDownloads: options.maxDownloads || null,
          viewed: 0,
          createdAt: new Date(),
          expiresAt: expiresAt,
        };
        memoryClipboards.set(code, item);
        saveTempStorage();

        globalStats.textSharesCount++;
        return code;
      }
    }
  } catch (err) {
    console.warn("[Database] MySQL write failed, using memory/file storage fallback:", err);
  }

  do {
    code = generateNumericCode(6);
    attempts++;
  } while (memoryClipboards.has(code) && attempts < 100);

  const item: InMemoryClipboard = {
    id: memoryClipboardIdCounter++,
    code,
    content: options.content,
    selfDestruct,
    destructMode,
    password: options.password || null,
    viewCount: 0,
    maxViews: options.maxViews || (destructMode === "view" ? 1 : null),
    downloadCount: 0,
    maxDownloads: options.maxDownloads || null,
    viewed: 0,
    createdAt: new Date(),
    expiresAt: expiresAt,
  };
  memoryClipboards.set(code, item);
  saveTempStorage();

  globalStats.textSharesCount++;
  return code;
}

function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expTime = new Date(expiresAt).getTime();
  if (isNaN(expTime)) return false;
  return Date.now() > expTime;
}

export async function getClipboardByCode(code: string) {
  loadTempStorage();

  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(clipboards).where(eq(clipboards.code, code)).limit(1);
      if (result.length > 0) {
        const clipboard = result[0];
        if (isExpired(clipboard.expiresAt)) {
          await db.delete(clipboards).where(eq(clipboards.code, code));
          memoryClipboards.delete(code);
          saveTempStorage();
          return null;
        }
        return clipboard;
      }
    }
  } catch (err) {
    console.warn("[Database] MySQL read failed, falling back to memory/file storage:", err);
  }

  const clipboard = memoryClipboards.get(code);
  if (!clipboard) return null;
  if (isExpired(clipboard.expiresAt)) {
    memoryClipboards.delete(code);
    saveTempStorage();
    return null;
  }
  return clipboard;
}

export async function markClipboardAsViewed(code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    const clipboard = memoryClipboards.get(code);
    if (!clipboard) return false;
    clipboard.viewCount++;
    clipboard.viewed = 1;

    let shouldDelete = false;
    if (clipboard.destructMode === "view" || clipboard.selfDestruct) {
      if (clipboard.maxViews && clipboard.viewCount >= clipboard.maxViews) {
        shouldDelete = true;
      } else if (!clipboard.maxViews) {
        shouldDelete = true;
      }
    }

    if (shouldDelete) {
      memoryClipboards.delete(code);
    }
    return shouldDelete;
  }

  const clipboard = await getClipboardByCode(code);
  if (!clipboard) return false;

  const newViewCount = (clipboard.viewCount || 0) + 1;
  let shouldDelete = false;

  if (clipboard.destructMode === "view" || clipboard.selfDestruct) {
    if (clipboard.maxViews && newViewCount >= clipboard.maxViews) {
      shouldDelete = true;
    } else if (!clipboard.maxViews) {
      shouldDelete = true;
    }
  }

  if (shouldDelete) {
    await db.delete(clipboards).where(eq(clipboards.code, code));
  } else {
    await db.update(clipboards).set({ viewCount: newViewCount, viewed: 1 }).where(eq(clipboards.code, code));
  }
  return shouldDelete;
}

// FILES SHARING
export async function createFile(options: {
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  expiryOption?: string;
  password?: string;
  selfDestruct?: boolean;
  destructMode?: "view" | "download" | "time" | "none";
  maxViews?: number;
  maxDownloads?: number;
}): Promise<string> {
  const expiresAt = parseExpiryOption(options.expiryOption || "24h");
  const selfDestruct = options.selfDestruct ? 1 : 0;
  const destructMode = options.destructMode || (selfDestruct ? "download" : "none");

  loadTempStorage();

  let code: string;
  let attempts = 0;

  try {
    const db = await getDb();
    if (db) {
      let isUnique = false;
      do {
        code = generateNumericCode(6);
        const existing = await db.select().from(files).where(eq(files.code, code)).limit(1);
        isUnique = existing.length === 0;
        attempts++;
      } while (!isUnique && attempts < 100);

      if (isUnique) {
        await db.insert(files).values({
          code,
          originalName: options.originalName,
          mimeType: options.mimeType,
          fileSize: options.fileSize,
          filePath: options.filePath,
          password: options.password || null,
          selfDestruct,
          destructMode,
          viewCount: 0,
          maxViews: options.maxViews || null,
          downloadCount: 0,
          maxDownloads: options.maxDownloads || (destructMode === "download" ? 1 : null),
          expiresAt: expiresAt as any,
        });

        const item: InMemoryFile = {
          id: memoryFileIdCounter++,
          code,
          originalName: options.originalName,
          mimeType: options.mimeType,
          fileSize: options.fileSize,
          filePath: options.filePath,
          password: options.password || null,
          selfDestruct,
          destructMode,
          viewCount: 0,
          maxViews: options.maxViews || null,
          downloadCount: 0,
          maxDownloads: options.maxDownloads || (destructMode === "download" ? 1 : null),
          createdAt: new Date(),
          expiresAt: expiresAt,
        };
        memoryFiles.set(code, item);
        saveTempStorage();

        globalStats.filesSharedCount++;
        return code;
      }
    }
  } catch (err) {
    console.warn("[Database] MySQL file write failed, using memory/file storage fallback:", err);
  }

  do {
    code = generateNumericCode(6);
    attempts++;
  } while (memoryFiles.has(code) && attempts < 100);

  const item: InMemoryFile = {
    id: memoryFileIdCounter++,
    code,
    originalName: options.originalName,
    mimeType: options.mimeType,
    fileSize: options.fileSize,
    filePath: options.filePath,
    password: options.password || null,
    selfDestruct,
    destructMode,
    viewCount: 0,
    maxViews: options.maxViews || null,
    downloadCount: 0,
    maxDownloads: options.maxDownloads || (destructMode === "download" ? 1 : null),
    createdAt: new Date(),
    expiresAt: expiresAt,
  };
  memoryFiles.set(code, item);
  saveTempStorage();

  globalStats.filesSharedCount++;
  return code;
}

export async function getFileByCode(code: string) {
  loadTempStorage();

  try {
    const db = await getDb();
    if (db) {
      const result = await db.select().from(files).where(eq(files.code, code)).limit(1);
      if (result.length > 0) {
        const file = result[0];
        if (isExpired(file.expiresAt)) {
          await db.delete(files).where(eq(files.code, code));
          memoryFiles.delete(code);
          saveTempStorage();
          return null;
        }
        return file;
      }
    }
  } catch (err) {
    console.warn("[Database] MySQL file read failed, falling back to memory/file storage:", err);
  }

  const file = memoryFiles.get(code);
  if (!file) return null;
  if (isExpired(file.expiresAt)) {
    memoryFiles.delete(code);
    saveTempStorage();
    return null;
  }
  return file;
}

export async function registerFileDownload(code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    const file = memoryFiles.get(code);
    if (!file) return false;
    file.downloadCount++;
    let shouldDelete = false;
    if (file.destructMode === "download" || file.selfDestruct) {
      if (file.maxDownloads && file.downloadCount >= file.maxDownloads) {
        shouldDelete = true;
      } else if (!file.maxDownloads) {
        shouldDelete = true;
      }
    }
    if (shouldDelete) {
      memoryFiles.delete(code);
    }
    return shouldDelete;
  }

  const file = await getFileByCode(code);
  if (!file) return false;

  const newDownloadCount = (file.downloadCount || 0) + 1;
  let shouldDelete = false;
  if (file.destructMode === "download" || file.selfDestruct) {
    if (file.maxDownloads && newDownloadCount >= file.maxDownloads) {
      shouldDelete = true;
    } else if (!file.maxDownloads) {
      shouldDelete = true;
    }
  }

  if (shouldDelete) {
    await db.delete(files).where(eq(files.code, code));
  } else {
    await db.update(files).set({ downloadCount: newDownloadCount }).where(eq(files.code, code));
  }
  return shouldDelete;
}

// ROOMS
export async function createRoom(options: {
  name: string;
  password?: string;
  expiryOption?: string;
  ownerToken: string;
}): Promise<{ code: string; room: SharedRoom }> {
  const expiresAt = parseExpiryOption(options.expiryOption || "24h");
  const db = await getDb();

  let code: string;
  let attempts = 0;

  if (!db) {
    do {
      code = generateNumericCode(6);
      attempts++;
    } while (memoryRooms.has(code) && attempts < 100);

    const room: InMemoryRoom = {
      id: memoryRoomIdCounter++,
      code,
      name: options.name,
      password: options.password || null,
      isLocked: 0,
      ownerToken: options.ownerToken,
      clipboardText: "Welcome to " + options.name + "! Type here to collaborate live.",
      notes: "Shared Notes Scratchpad:\n- Add meeting points\n- Paste quick code snippets",
      createdAt: new Date(),
      expiresAt: expiresAt,
    };
    memoryRooms.set(code, room);
    globalStats.roomsCreatedCount++;
    saveTempStorage();
    return { code, room };
  }

  let isUnique = false;
  do {
    code = generateNumericCode(6);
    const existing = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
    isUnique = existing.length === 0;
    attempts++;
  } while (!isUnique && attempts < 100);

  const roomValues = {
    code,
    name: options.name,
    password: options.password || null,
    isLocked: 0,
    ownerToken: options.ownerToken,
    clipboardText: "Welcome to " + options.name + "! Type here to collaborate live.",
    notes: "Shared Notes Scratchpad:\n- Add meeting points\n- Paste quick code snippets",
    expiresAt: expiresAt as any,
  };

  await db.insert(rooms).values(roomValues);
  globalStats.roomsCreatedCount++;
  const created = await getRoomByCode(code);
  return { code, room: created! };
}

export async function getRoomByCode(code: string): Promise<SharedRoom | null> {
  const db = await getDb();
  if (!db) {
    const room = memoryRooms.get(code);
    if (!room) return null;
    if (room.expiresAt && new Date() > new Date(room.expiresAt)) {
      memoryRooms.delete(code);
      saveTempStorage();
      return null;
    }
    return room;
  }

  const result = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  if (result.length === 0) return null;
  const room = result[0];
  if (room.expiresAt && new Date() > new Date(room.expiresAt)) {
    await db.delete(rooms).where(eq(rooms.code, code));
    return null;
  }
  return room;
}

export async function updateRoomClipboard(code: string, text: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    const room = memoryRooms.get(code);
    if (room) room.clipboardText = text;
    saveTempStorage();
    return;
  }
  await db.update(rooms).set({ clipboardText: text }).where(eq(rooms.code, code));
}

export async function updateRoomNotes(code: string, notes: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    const room = memoryRooms.get(code);
    if (room) room.notes = notes;
    saveTempStorage();
    return;
  }
  await db.update(rooms).set({ notes: notes }).where(eq(rooms.code, code));
}

export async function updateRoomLock(code: string, isLocked: boolean): Promise<void> {
  const db = await getDb();
  if (!db) {
    const room = memoryRooms.get(code);
    if (room) room.isLocked = isLocked ? 1 : 0;
    saveTempStorage();
    return;
  }
  await db.update(rooms).set({ isLocked: isLocked ? 1 : 0 }).where(eq(rooms.code, code));
}

export async function regenerateRoomCode(oldCode: string): Promise<string> {
  const room = await getRoomByCode(oldCode);
  if (!room) throw new Error("Room not found");

  const newCode = generateNumericCode(6);
  const db = await getDb();
  if (!db) {
    memoryRooms.delete(oldCode);
    room.code = newCode;
    memoryRooms.set(newCode, room as InMemoryRoom);
    saveTempStorage();
    return newCode;
  }

  await db.update(rooms).set({ code: newCode }).where(eq(rooms.code, oldCode));
  return newCode;
}

export async function deleteRoom(code: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryRooms.delete(code);
    saveTempStorage();
    return;
  }
  await db.delete(rooms).where(eq(rooms.code, code));
}

export async function addRoomFile(options: {
  roomCode: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
}): Promise<RoomFile> {
  const db = await getDb();
  if (!db) {
    const item: InMemoryRoomFile = {
      id: memoryRoomFileIdCounter++,
      roomCode: options.roomCode,
      originalName: options.originalName,
      mimeType: options.mimeType,
      fileSize: options.fileSize,
      filePath: options.filePath,
      createdAt: new Date(),
    };
    memoryRoomFiles.set(item.id, item);
    saveTempStorage();
    return item;
  }

  await db.insert(roomFiles).values(options);
  const res = await db
    .select()
    .from(roomFiles)
    .where(eq(roomFiles.roomCode, options.roomCode))
    .orderBy(roomFiles.createdAt);
  return res[res.length - 1];
}

export async function getRoomFiles(roomCode: string): Promise<RoomFile[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(memoryRoomFiles.values()).filter((f) => f.roomCode === roomCode);
  }
  return await db.select().from(roomFiles).where(eq(roomFiles.roomCode, roomCode));
}

// STATS & ANALYTICS
export function incrementStat(stat: keyof typeof globalStats) {
  if (globalStats[stat] !== undefined) {
    globalStats[stat]++;
  }
}

export async function getStatsOverview() {
  return { ...globalStats };
}

export async function createContactSubmission(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactSubmissions).values(data);
}
