// server/api.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var clipboards = mysqlTable("clipboards", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique 6-digit code for retrieving this clipboard */
  code: varchar("code", { length: 6 }).notNull().unique(),
  /** The text content to be shared (unlimited length) */
  content: text("content").notNull(),
  /** Whether self-destruct mode is enabled (1 or 0) */
  selfDestruct: int("selfDestruct").default(0).notNull(),
  /** Destruct mode: 'view' | 'download' | 'time' | 'none' */
  destructMode: varchar("destructMode", { length: 20 }).default("none").notNull(),
  /** Optional password for access */
  password: varchar("password", { length: 255 }),
  /** Number of views so far */
  viewCount: int("viewCount").default(0).notNull(),
  /** Maximum views allowed before destruction (null for unlimited) */
  maxViews: int("maxViews"),
  /** Number of downloads so far */
  downloadCount: int("downloadCount").default(0).notNull(),
  /** Maximum downloads allowed before destruction (null for unlimited) */
  maxDownloads: int("maxDownloads"),
  /** Whether this clipboard has been viewed */
  viewed: int("viewed").default(0).notNull(),
  /** Timestamp when the clipboard was created */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Timestamp when the clipboard expires (null for never expire) */
  expiresAt: timestamp("expiresAt")
});
var files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: int("fileSize").notNull(),
  filePath: text("filePath").notNull(),
  password: varchar("password", { length: 255 }),
  selfDestruct: int("selfDestruct").default(0).notNull(),
  destructMode: varchar("destructMode", { length: 20 }).default("none").notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  maxViews: int("maxViews"),
  downloadCount: int("downloadCount").default(0).notNull(),
  maxDownloads: int("maxDownloads"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt")
});
var rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  isLocked: int("isLocked").default(0).notNull(),
  ownerToken: varchar("ownerToken", { length: 64 }).notNull(),
  clipboardText: text("clipboardText").default("").notNull(),
  notes: text("notes").default("").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt")
});
var roomFiles = mysqlTable("room_files", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 6 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: int("fileSize").notNull(),
  filePath: text("filePath").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var analyticsStats = mysqlTable("analytics_stats", {
  id: int("id").autoincrement().primaryKey(),
  filesSharedCount: int("filesSharedCount").default(0).notNull(),
  textSharesCount: int("textSharesCount").default(0).notNull(),
  qrGeneratedCount: int("qrGeneratedCount").default(0).notNull(),
  ocrConversionsCount: int("ocrConversionsCount").default(0).notNull(),
  roomsCreatedCount: int("roomsCreatedCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/firebase.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
var db = null;
var isInitialized = false;
function initFirebase() {
  if (isInitialized) return db;
  isInitialized = true;
  try {
    if (getApps().length > 0) {
      db = getFirestore();
      return db;
    }
    let serviceAccount = null;
    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envKey) {
      try {
        serviceAccount = JSON.parse(envKey);
      } catch {
        if (fs.existsSync(envKey)) {
          serviceAccount = JSON.parse(fs.readFileSync(envKey, "utf-8"));
        }
      }
    }
    if (!serviceAccount) {
      const possiblePaths = [
        path.join(process.cwd(), "serviceAccountKey.json"),
        path.join(process.cwd(), "serviceAccount.json"),
        path.join(process.cwd(), "firebase-key.json")
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          try {
            const content = fs.readFileSync(p, "utf-8");
            serviceAccount = JSON.parse(content);
            console.log(`[Firebase] Loaded service account credentials from ${p}`);
            break;
          } catch (e) {
            console.warn(`[Firebase] Failed to parse credentials at ${p}:`, e);
          }
        }
      }
    }
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount)
      });
      db = getFirestore();
      console.log("[Firebase] Firestore initialized successfully for permanent rooms.");
    } else {
      console.warn(
        "[Firebase] Service account credentials not found. 'Never Expire' rooms will fall back to local persistent cache until serviceAccountKey.json is placed in the project root."
      );
    }
  } catch (err) {
    console.error("[Firebase] Initialization error:", err);
    db = null;
  }
  return db;
}
function getFirestoreDb() {
  return initFirebase();
}
async function saveFirebaseRoom(room) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const data = {
      code: room.code,
      name: room.name,
      password: room.password || null,
      isLocked: Boolean(room.isLocked),
      ownerToken: room.ownerToken,
      clipboardText: room.clipboardText,
      notes: room.notes,
      createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt: null
    };
    await fdb.collection("never_expire_rooms").doc(room.code).set(data);
  } catch (err) {
    console.error("[Firebase] Failed to save room to Firestore:", err);
  }
}
async function getFirebaseRoomByCode(code) {
  const fdb = getFirestoreDb();
  if (!fdb) return null;
  try {
    const doc = await fdb.collection("never_expire_rooms").doc(code).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (err) {
    console.error("[Firebase] Failed to get room from Firestore:", err);
    return null;
  }
}
async function updateFirebaseRoomClipboard(code, text2) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    await fdb.collection("never_expire_rooms").doc(code).update({
      clipboardText: text2
    });
  } catch (err) {
  }
}
async function updateFirebaseRoomNotes(code, notes) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    await fdb.collection("never_expire_rooms").doc(code).update({
      notes
    });
  } catch (err) {
  }
}
async function updateFirebaseRoomLock(code, isLocked) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    await fdb.collection("never_expire_rooms").doc(code).update({
      isLocked: Boolean(isLocked)
    });
  } catch (err) {
  }
}
async function regenerateFirebaseRoomCode(oldCode, newCode) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const doc = await fdb.collection("never_expire_rooms").doc(oldCode).get();
    if (doc.exists) {
      const data = doc.data();
      data.code = newCode;
      await fdb.collection("never_expire_rooms").doc(newCode).set(data);
      await fdb.collection("never_expire_rooms").doc(oldCode).delete();
    }
  } catch (err) {
    console.error("[Firebase] Failed to regenerate room code in Firestore:", err);
  }
}
async function deleteFirebaseRoom(code) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    await fdb.collection("never_expire_rooms").doc(code).delete();
  } catch (err) {
    console.error("[Firebase] Failed to delete room from Firestore:", err);
  }
}
async function addFirebaseRoomFile(file) {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    await fdb.collection("never_expire_room_files").add({
      ...file,
      createdAt: file.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("[Firebase] Failed to add room file to Firestore:", err);
  }
}
async function getFirebaseRoomFiles(roomCode) {
  const fdb = getFirestoreDb();
  if (!fdb) return [];
  try {
    const snapshot = await fdb.collection("never_expire_room_files").where("roomCode", "==", roomCode).get();
    const result = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      result.push({
        ...data,
        id: doc.id
      });
    });
    return result;
  } catch (err) {
    console.error("[Firebase] Failed to get room files from Firestore:", err);
    return [];
  }
}

// server/db.ts
import fs2 from "fs";
import path2 from "path";
import os from "os";
var _db = null;
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db2 = await getDb();
  if (!db2) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db2.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db2 = await getDb();
  if (!db2) return void 0;
  const result = await db2.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var memoryClipboards = /* @__PURE__ */ new Map();
var memoryFiles = /* @__PURE__ */ new Map();
var memoryRooms = /* @__PURE__ */ new Map();
var memoryRoomFiles = /* @__PURE__ */ new Map();
var memoryClipboardIdCounter = 1;
var memoryFileIdCounter = 1;
var memoryRoomIdCounter = 1;
var memoryRoomFileIdCounter = 1;
var TEMP_STORAGE_FILE = path2.join(os.tmpdir(), "qc_storage_cache.json");
function loadTempStorage() {
  try {
    if (fs2.existsSync(TEMP_STORAGE_FILE)) {
      const raw = fs2.readFileSync(TEMP_STORAGE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (data && data.clipboards) {
        Object.entries(data.clipboards).forEach(([code, item]) => {
          memoryClipboards.set(code, item);
        });
      }
      if (data && data.files) {
        Object.entries(data.files).forEach(([code, item]) => {
          memoryFiles.set(code, item);
        });
      }
      if (data && data.rooms) {
        Object.entries(data.rooms).forEach(([code, item]) => {
          memoryRooms.set(code, item);
        });
      }
      if (data && data.roomFiles) {
        Object.entries(data.roomFiles).forEach(([idStr, item]) => {
          memoryRoomFiles.set(Number(idStr), item);
        });
      }
    }
  } catch (err) {
  }
}
function saveTempStorage() {
  try {
    const data = {
      clipboards: Object.fromEntries(memoryClipboards),
      files: Object.fromEntries(memoryFiles),
      rooms: Object.fromEntries(memoryRooms),
      roomFiles: Object.fromEntries(memoryRoomFiles)
    };
    fs2.writeFileSync(TEMP_STORAGE_FILE, JSON.stringify(data), "utf-8");
  } catch (err) {
  }
}
loadTempStorage();
var globalStats = {
  filesSharedCount: 142,
  textSharesCount: 389,
  qrGeneratedCount: 512,
  ocrConversionsCount: 94,
  roomsCreatedCount: 47
};
function parseExpiryOption(expiry) {
  const now = Date.now();
  switch (expiry) {
    case "10m":
      return new Date(now + 10 * 60 * 1e3);
    case "1h":
      return new Date(now + 60 * 60 * 1e3);
    case "24h":
      return new Date(now + 24 * 60 * 60 * 1e3);
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1e3);
    case "never":
      return null;
    default:
      return new Date(now + 24 * 60 * 60 * 1e3);
  }
}
function generateNumericCode(length = 6) {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
async function createClipboard(options) {
  const expiresAt = parseExpiryOption(options.expiryOption || "24h");
  const selfDestruct = options.selfDestruct ? 1 : 0;
  const destructMode = options.destructMode || (selfDestruct ? "view" : "none");
  loadTempStorage();
  let code;
  let attempts = 0;
  try {
    const db2 = await getDb();
    if (db2) {
      let isUnique = false;
      do {
        code = generateNumericCode(6);
        const existing = await db2.select().from(clipboards).where(eq(clipboards.code, code)).limit(1);
        isUnique = existing.length === 0;
        attempts++;
      } while (!isUnique && attempts < 100);
      if (isUnique) {
        await db2.insert(clipboards).values({
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
          expiresAt
        });
        const item2 = {
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
          createdAt: /* @__PURE__ */ new Date(),
          expiresAt
        };
        memoryClipboards.set(code, item2);
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
  const item = {
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
    createdAt: /* @__PURE__ */ new Date(),
    expiresAt
  };
  memoryClipboards.set(code, item);
  saveTempStorage();
  globalStats.textSharesCount++;
  return code;
}
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const expTime = new Date(expiresAt).getTime();
  if (isNaN(expTime)) return false;
  return Date.now() > expTime;
}
async function getClipboardByCode(code) {
  loadTempStorage();
  try {
    const db2 = await getDb();
    if (db2) {
      const result = await db2.select().from(clipboards).where(eq(clipboards.code, code)).limit(1);
      if (result.length > 0) {
        const clipboard2 = result[0];
        if (isExpired(clipboard2.expiresAt)) {
          await db2.delete(clipboards).where(eq(clipboards.code, code));
          memoryClipboards.delete(code);
          saveTempStorage();
          return null;
        }
        return clipboard2;
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
async function markClipboardAsViewed(code) {
  const db2 = await getDb();
  if (!db2) {
    const clipboard2 = memoryClipboards.get(code);
    if (!clipboard2) return false;
    clipboard2.viewCount++;
    clipboard2.viewed = 1;
    let shouldDelete2 = false;
    if (clipboard2.destructMode === "view" || clipboard2.selfDestruct) {
      if (clipboard2.maxViews && clipboard2.viewCount >= clipboard2.maxViews) {
        shouldDelete2 = true;
      } else if (!clipboard2.maxViews) {
        shouldDelete2 = true;
      }
    }
    if (shouldDelete2) {
      memoryClipboards.delete(code);
    }
    return shouldDelete2;
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
    await db2.delete(clipboards).where(eq(clipboards.code, code));
  } else {
    await db2.update(clipboards).set({ viewCount: newViewCount, viewed: 1 }).where(eq(clipboards.code, code));
  }
  return shouldDelete;
}
async function createFile(options) {
  const expiresAt = parseExpiryOption(options.expiryOption || "24h");
  const selfDestruct = options.selfDestruct ? 1 : 0;
  const destructMode = options.destructMode || (selfDestruct ? "download" : "none");
  loadTempStorage();
  let code;
  let attempts = 0;
  try {
    const db2 = await getDb();
    if (db2) {
      let isUnique = false;
      do {
        code = generateNumericCode(6);
        const existing = await db2.select().from(files).where(eq(files.code, code)).limit(1);
        isUnique = existing.length === 0;
        attempts++;
      } while (!isUnique && attempts < 100);
      if (isUnique) {
        await db2.insert(files).values({
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
          expiresAt
        });
        const item2 = {
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
          createdAt: /* @__PURE__ */ new Date(),
          expiresAt
        };
        memoryFiles.set(code, item2);
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
  const item = {
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
    createdAt: /* @__PURE__ */ new Date(),
    expiresAt
  };
  memoryFiles.set(code, item);
  saveTempStorage();
  globalStats.filesSharedCount++;
  return code;
}
async function getFileByCode(code) {
  loadTempStorage();
  try {
    const db2 = await getDb();
    if (db2) {
      const result = await db2.select().from(files).where(eq(files.code, code)).limit(1);
      if (result.length > 0) {
        const file2 = result[0];
        if (isExpired(file2.expiresAt)) {
          await db2.delete(files).where(eq(files.code, code));
          memoryFiles.delete(code);
          saveTempStorage();
          return null;
        }
        return file2;
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
async function registerFileDownload(code) {
  const db2 = await getDb();
  if (!db2) {
    const file2 = memoryFiles.get(code);
    if (!file2) return false;
    file2.downloadCount++;
    let shouldDelete2 = false;
    if (file2.destructMode === "download" || file2.selfDestruct) {
      if (file2.maxDownloads && file2.downloadCount >= file2.maxDownloads) {
        shouldDelete2 = true;
      } else if (!file2.maxDownloads) {
        shouldDelete2 = true;
      }
    }
    if (shouldDelete2) {
      memoryFiles.delete(code);
    }
    return shouldDelete2;
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
    await db2.delete(files).where(eq(files.code, code));
  } else {
    await db2.update(files).set({ downloadCount: newDownloadCount }).where(eq(files.code, code));
  }
  return shouldDelete;
}
async function createRoom(options) {
  const expiresAt = parseExpiryOption(options.expiryOption || "24h");
  const db2 = await getDb();
  let code;
  let attempts = 0;
  if (!db2) {
    do {
      code = generateNumericCode(6);
      attempts++;
    } while (memoryRooms.has(code) && attempts < 100);
    const room = {
      id: memoryRoomIdCounter++,
      code,
      name: options.name,
      password: options.password || null,
      isLocked: 0,
      ownerToken: options.ownerToken,
      clipboardText: "Welcome to " + options.name + "! Type here to collaborate live.",
      notes: "Shared Notes Scratchpad:\n- Add meeting points\n- Paste quick code snippets",
      createdAt: /* @__PURE__ */ new Date(),
      expiresAt
    };
    memoryRooms.set(code, room);
    globalStats.roomsCreatedCount++;
    saveTempStorage();
    if (options.expiryOption === "never" || expiresAt === null) {
      await saveFirebaseRoom(room);
    }
    return { code, room };
  }
  let isUnique = false;
  do {
    code = generateNumericCode(6);
    const existing = await db2.select().from(rooms).where(eq(rooms.code, code)).limit(1);
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
    expiresAt
  };
  await db2.insert(rooms).values(roomValues);
  globalStats.roomsCreatedCount++;
  const created = await getRoomByCode(code);
  if ((options.expiryOption === "never" || expiresAt === null) && created) {
    await saveFirebaseRoom(created);
  }
  return { code, room: created };
}
async function getRoomByCode(code) {
  const db2 = await getDb();
  let room = null;
  if (!db2) {
    const memRoom = memoryRooms.get(code);
    if (memRoom) {
      if (memRoom.expiresAt && /* @__PURE__ */ new Date() > new Date(memRoom.expiresAt)) {
        memoryRooms.delete(code);
        saveTempStorage();
      } else {
        room = memRoom;
      }
    }
  } else {
    const result = await db2.select().from(rooms).where(eq(rooms.code, code)).limit(1);
    if (result.length > 0) {
      const dbRoom = result[0];
      if (dbRoom.expiresAt && /* @__PURE__ */ new Date() > new Date(dbRoom.expiresAt)) {
        await db2.delete(rooms).where(eq(rooms.code, code));
      } else {
        room = dbRoom;
      }
    }
  }
  if (!room) {
    const fbRoom = await getFirebaseRoomByCode(code);
    if (fbRoom) {
      const createdRoom = {
        id: Math.floor(Math.random() * 1e5),
        code: fbRoom.code,
        name: fbRoom.name,
        password: fbRoom.password || null,
        isLocked: fbRoom.isLocked ? 1 : 0,
        ownerToken: fbRoom.ownerToken,
        clipboardText: fbRoom.clipboardText || "",
        notes: fbRoom.notes || "",
        createdAt: new Date(fbRoom.createdAt),
        expiresAt: null
      };
      memoryRooms.set(code, createdRoom);
      saveTempStorage();
      return createdRoom;
    }
    return null;
  }
  return room;
}
async function updateRoomClipboard(code, text2) {
  const db2 = await getDb();
  if (!db2) {
    const room = memoryRooms.get(code);
    if (room) room.clipboardText = text2;
    saveTempStorage();
  } else {
    await db2.update(rooms).set({ clipboardText: text2 }).where(eq(rooms.code, code));
  }
  await updateFirebaseRoomClipboard(code, text2);
}
async function updateRoomNotes(code, notes) {
  const db2 = await getDb();
  if (!db2) {
    const room = memoryRooms.get(code);
    if (room) room.notes = notes;
    saveTempStorage();
  } else {
    await db2.update(rooms).set({ notes }).where(eq(rooms.code, code));
  }
  await updateFirebaseRoomNotes(code, notes);
}
async function updateRoomLock(code, isLocked) {
  const db2 = await getDb();
  if (!db2) {
    const room = memoryRooms.get(code);
    if (room) room.isLocked = isLocked ? 1 : 0;
    saveTempStorage();
  } else {
    await db2.update(rooms).set({ isLocked: isLocked ? 1 : 0 }).where(eq(rooms.code, code));
  }
  await updateFirebaseRoomLock(code, isLocked);
}
async function regenerateRoomCode(oldCode) {
  const room = await getRoomByCode(oldCode);
  if (!room) throw new Error("Room not found");
  const newCode = generateNumericCode(6);
  const db2 = await getDb();
  if (!db2) {
    memoryRooms.delete(oldCode);
    room.code = newCode;
    memoryRooms.set(newCode, room);
    saveTempStorage();
  } else {
    await db2.update(rooms).set({ code: newCode }).where(eq(rooms.code, oldCode));
  }
  await regenerateFirebaseRoomCode(oldCode, newCode);
  return newCode;
}
async function deleteRoom(code) {
  const db2 = await getDb();
  if (!db2) {
    memoryRooms.delete(code);
    saveTempStorage();
  } else {
    await db2.delete(rooms).where(eq(rooms.code, code));
  }
  await deleteFirebaseRoom(code);
}
async function addRoomFile(options) {
  const db2 = await getDb();
  let item;
  if (!db2) {
    const memItem = {
      id: memoryRoomFileIdCounter++,
      roomCode: options.roomCode,
      originalName: options.originalName,
      mimeType: options.mimeType,
      fileSize: options.fileSize,
      filePath: options.filePath,
      createdAt: /* @__PURE__ */ new Date()
    };
    memoryRoomFiles.set(memItem.id, memItem);
    saveTempStorage();
    item = memItem;
  } else {
    await db2.insert(roomFiles).values(options);
    const res = await db2.select().from(roomFiles).where(eq(roomFiles.roomCode, options.roomCode)).orderBy(roomFiles.createdAt);
    item = res[res.length - 1];
  }
  await addFirebaseRoomFile({
    roomCode: options.roomCode,
    originalName: options.originalName,
    mimeType: options.mimeType,
    fileSize: options.fileSize,
    filePath: options.filePath,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  return item;
}
async function getRoomFiles(roomCode) {
  const db2 = await getDb();
  let filesList = [];
  if (!db2) {
    filesList = Array.from(memoryRoomFiles.values()).filter((f) => f.roomCode === roomCode);
  } else {
    filesList = await db2.select().from(roomFiles).where(eq(roomFiles.roomCode, roomCode));
  }
  if (filesList.length === 0) {
    const fbFiles = await getFirebaseRoomFiles(roomCode);
    if (fbFiles.length > 0) {
      return fbFiles.map((f, idx) => ({
        id: typeof f.id === "number" ? f.id : idx + 1e3,
        roomCode: f.roomCode,
        originalName: f.originalName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        filePath: f.filePath,
        createdAt: new Date(f.createdAt)
      }));
    }
  }
  return filesList;
}
function incrementStat(stat) {
  if (globalStats[stat] !== void 0) {
    globalStats[stat]++;
  }
}
async function getStatsOverview() {
  return { ...globalStats };
}
async function createContactSubmission(data) {
  const db2 = await getDb();
  if (!db2) return;
  await db2.insert(contactSubmissions).values(data);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/fileStorage.ts
import fs3 from "fs";
import path3 from "path";
import crypto from "crypto";
import os2 from "os";
var isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var UPLOAD_DIR = isVercel ? path3.join(os2.tmpdir(), "uploads") : path3.join(process.cwd(), "uploads");
try {
  if (!fs3.existsSync(UPLOAD_DIR)) {
    fs3.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  const fallbackDir = path3.join(os2.tmpdir(), "uploads");
  if (!fs3.existsSync(fallbackDir)) {
    fs3.mkdirSync(fallbackDir, { recursive: true });
  }
}
var ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".zip",
  ".txt"
];
var MAX_FILE_SIZE = 50 * 1024 * 1024;
function validateFileTypeAndSize(filename, fileSize) {
  const ext = path3.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type "${ext}". Supported types: JPG, PNG, WEBP, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, TXT.`
    };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of 50MB (uploaded: ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`
    };
  }
  return { valid: true };
}
async function saveUploadedFile(buffer, originalFilename, mimeType) {
  const ext = path3.extname(originalFilename).toLowerCase();
  const safeHash = crypto.randomBytes(8).toString("hex");
  const storedFilename = `${Date.now()}_${safeHash}${ext}`;
  const effectiveMime = mimeType || "application/octet-stream";
  const dataUrl = `data:${effectiveMime};base64,${buffer.toString("base64")}`;
  try {
    const uploadDir = path3.join(os2.tmpdir(), "uploads");
    if (!fs3.existsSync(uploadDir)) {
      fs3.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path3.join(uploadDir, storedFilename);
    await fs3.promises.writeFile(localFilePath, buffer);
  } catch (err) {
    console.warn("Serverless mode disk write skipped, using Data URL fallback", err);
  }
  return {
    filename: storedFilename,
    relativeUrl: dataUrl,
    filePath: dataUrl
  };
}

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  clipboard: router({
    /**
     * Create and send a text clipboard entry
     */
    send: publicProcedure.input(
      z2.object({
        content: z2.string().min(1, "Content cannot be empty"),
        selfDestruct: z2.boolean().default(false),
        destructMode: z2.enum(["view", "download", "time", "none"]).optional(),
        password: z2.string().optional(),
        maxViews: z2.number().min(1).max(1e3).optional(),
        maxDownloads: z2.number().min(1).max(1e3).optional(),
        expiryOption: z2.enum(["10m", "1h", "24h", "7d", "never"]).default("24h")
      })
    ).mutation(async ({ input }) => {
      const code = await createClipboard({
        content: input.content,
        selfDestruct: input.selfDestruct,
        destructMode: input.destructMode,
        password: input.password || void 0,
        maxViews: input.maxViews,
        maxDownloads: input.maxDownloads,
        expiryOption: input.expiryOption
      });
      return {
        code,
        shareUrl: `/share/${code}`
      };
    }),
    /**
     * Retrieve clipboard content by code
    /**
     * Retrieve clipboard content by code (with automatic file fallback)
     */
    retrieve: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        password: z2.string().optional()
      })
    ).query(async ({ input }) => {
      const clipboard = await getClipboardByCode(input.code);
      if (!clipboard) {
        const file = await getFileByCode(input.code);
        if (file) {
          if (file.password && file.password !== input.password) {
            return {
              requiresPassword: true,
              isPasswordValid: false,
              error: "Password required to view/download file."
            };
          }
          return {
            isFile: true,
            code: file.code,
            originalName: file.originalName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            filePath: file.filePath,
            selfDestruct: Boolean(file.selfDestruct),
            destructMode: file.destructMode,
            downloadCount: file.downloadCount,
            maxDownloads: file.maxDownloads,
            viewCount: file.viewCount,
            createdAt: file.createdAt,
            expiresAt: file.expiresAt
          };
        }
        return { error: "Content not found or has expired." };
      }
      if (clipboard.password && clipboard.password !== input.password) {
        return {
          requiresPassword: true,
          isPasswordValid: false,
          error: "Password required to view content."
        };
      }
      const destructed = await markClipboardAsViewed(input.code);
      return {
        content: clipboard.content,
        selfDestruct: Boolean(clipboard.selfDestruct),
        destructMode: clipboard.destructMode,
        viewCount: clipboard.viewCount + 1,
        maxViews: clipboard.maxViews,
        createdAt: clipboard.createdAt,
        expiresAt: clipboard.expiresAt,
        isDestructedNow: destructed
      };
    }),
    /**
     * Get clipboard info without deleting or marking viewed
     */
    info: publicProcedure.input(z2.object({ code: z2.string().min(6).max(6) })).query(async ({ input }) => {
      const clipboard = await getClipboardByCode(input.code);
      if (!clipboard) return null;
      return {
        exists: true,
        requiresPassword: Boolean(clipboard.password),
        selfDestruct: Boolean(clipboard.selfDestruct),
        destructMode: clipboard.destructMode,
        viewCount: clipboard.viewCount,
        maxViews: clipboard.maxViews,
        createdAt: clipboard.createdAt,
        expiresAt: clipboard.expiresAt
      };
    })
  }),
  file: router({
    /**
     * Upload a shared file (base64 encoded)
     */
    upload: publicProcedure.input(
      z2.object({
        filename: z2.string().min(1),
        mimeType: z2.string().min(1),
        fileSize: z2.number().min(1),
        base64Data: z2.string().min(1),
        password: z2.string().optional(),
        selfDestruct: z2.boolean().default(false),
        destructMode: z2.enum(["view", "download", "time", "none"]).optional(),
        maxViews: z2.number().optional(),
        maxDownloads: z2.number().optional(),
        expiryOption: z2.enum(["10m", "1h", "24h", "7d", "never"]).default("24h")
      })
    ).mutation(async ({ input }) => {
      const validation = validateFileTypeAndSize(input.filename, input.fileSize);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid file upload");
      }
      const base64Clean = input.base64Data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");
      const saved = await saveUploadedFile(buffer, input.filename, input.mimeType);
      const code = await createFile({
        originalName: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        filePath: saved.relativeUrl,
        password: input.password,
        selfDestruct: input.selfDestruct,
        destructMode: input.destructMode,
        maxViews: input.maxViews,
        maxDownloads: input.maxDownloads,
        expiryOption: input.expiryOption
      });
      return {
        code,
        shareUrl: `/share/${code}`,
        filePath: saved.relativeUrl
      };
    }),
    /**
     * Get shared file info by code (with automatic clipboard fallback)
     */
    retrieve: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        password: z2.string().optional()
      })
    ).query(async ({ input }) => {
      const file = await getFileByCode(input.code);
      if (!file) {
        const clipboard = await getClipboardByCode(input.code);
        if (clipboard) {
          if (clipboard.password && clipboard.password !== input.password) {
            return {
              requiresPassword: true,
              isPasswordValid: false,
              error: "Password required to view content."
            };
          }
          return {
            isText: true,
            code: clipboard.code,
            content: clipboard.content,
            selfDestruct: Boolean(clipboard.selfDestruct),
            destructMode: clipboard.destructMode,
            viewCount: clipboard.viewCount + 1,
            maxViews: clipboard.maxViews,
            createdAt: clipboard.createdAt,
            expiresAt: clipboard.expiresAt
          };
        }
        return { error: "File or clipboard not found, or has expired." };
      }
      if (file.password && file.password !== input.password) {
        return {
          requiresPassword: true,
          isPasswordValid: false,
          error: "Password required to view/download file."
        };
      }
      return {
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        filePath: file.filePath,
        selfDestruct: Boolean(file.selfDestruct),
        destructMode: file.destructMode,
        downloadCount: file.downloadCount,
        maxDownloads: file.maxDownloads,
        viewCount: file.viewCount,
        maxViews: file.maxViews,
        createdAt: file.createdAt,
        expiresAt: file.expiresAt
      };
    }),
    /**
     * Register a download and handle self-destruct countdown
     */
    registerDownload: publicProcedure.input(z2.object({ code: z2.string().min(6).max(6) })).mutation(async ({ input }) => {
      const destructed = await registerFileDownload(input.code);
      return { isDestructedNow: destructed };
    })
  }),
  room: router({
    /**
     * Create a real-time room
     */
    create: publicProcedure.input(
      z2.object({
        name: z2.string().min(1, "Room name is required").max(100),
        password: z2.string().optional(),
        expiryOption: z2.enum(["10m", "1h", "24h", "7d", "never"]).default("24h"),
        ownerToken: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const { code, room } = await createRoom({
        name: input.name,
        password: input.password,
        expiryOption: input.expiryOption,
        ownerToken: input.ownerToken
      });
      return {
        code,
        roomUrl: `/room/${code}`,
        room
      };
    }),
    /**
     * Get details for joining room
     */
    info: publicProcedure.input(z2.object({ code: z2.string().min(6).max(6) })).query(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) return null;
      return {
        name: room.name,
        requiresPassword: Boolean(room.password),
        isLocked: Boolean(room.isLocked),
        createdAt: room.createdAt,
        expiresAt: room.expiresAt
      };
    }),
    /**
     * Join an existing room
     */
    join: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        password: z2.string().optional(),
        name: z2.string().optional(),
        ownerToken: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) {
        throw new Error("Room not found or has expired");
      }
      if (room.isLocked && room.ownerToken !== input.ownerToken) {
        throw new Error("Room is locked by owner");
      }
      if (room.password && room.password !== input.password) {
        throw new Error("Incorrect room password");
      }
      const isOwner = room.ownerToken === input.ownerToken;
      return {
        success: true,
        room: {
          code: room.code,
          name: room.name,
          isLocked: Boolean(room.isLocked),
          isOwner,
          clipboardText: room.clipboardText,
          notes: room.notes,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt
        }
      };
    }),
    /**
     * Poll/Fetch room state sync
     */
    getSync: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        ownerToken: z2.string().min(1)
      })
    ).query(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) {
        return { isDeleted: true };
      }
      const isOwner = room.ownerToken === input.ownerToken;
      return {
        isDeleted: false,
        code: room.code,
        name: room.name,
        isLocked: Boolean(room.isLocked),
        isOwner,
        clipboardText: room.clipboardText,
        notes: room.notes,
        expiresAt: room.expiresAt
      };
    }),
    /**
     * Update room clipboard text
     */
    updateClipboard: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        text: z2.string()
      })
    ).mutation(async ({ input }) => {
      await updateRoomClipboard(input.code, input.text);
      return { success: true };
    }),
    /**
     * Update room notes text
     */
    updateNotes: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        notes: z2.string()
      })
    ).mutation(async ({ input }) => {
      await updateRoomNotes(input.code, input.notes);
      return { success: true };
    }),
    /**
     * Toggle lock status
     */
    toggleLock: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        isLocked: z2.boolean(),
        ownerToken: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) throw new Error("Room not found");
      if (room.ownerToken !== input.ownerToken) {
        throw new Error("Only the room owner can lock/unlock the room");
      }
      await updateRoomLock(input.code, input.isLocked);
      return { success: true, isLocked: input.isLocked };
    }),
    /**
     * Regenerate room code
     */
    regenerateCode: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        ownerToken: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) throw new Error("Room not found");
      if (room.ownerToken !== input.ownerToken) {
        throw new Error("Only the room owner can regenerate the room link");
      }
      const newCode = await regenerateRoomCode(input.code);
      return { newCode };
    }),
    /**
     * Delete room
     */
    deleteRoom: publicProcedure.input(
      z2.object({
        code: z2.string().min(6).max(6),
        ownerToken: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) return { success: true };
      if (room.ownerToken !== input.ownerToken) {
        throw new Error("Only the room owner can delete this room");
      }
      await deleteRoom(input.code);
      return { success: true };
    }),
    /**
     * Upload file to room feed
     */
    uploadFile: publicProcedure.input(
      z2.object({
        roomCode: z2.string().min(6).max(6),
        filename: z2.string().min(1),
        mimeType: z2.string().min(1),
        fileSize: z2.number().min(1),
        base64Data: z2.string().min(1)
      })
    ).mutation(async ({ input }) => {
      const validation = validateFileTypeAndSize(input.filename, input.fileSize);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid room file upload");
      }
      const base64Clean = input.base64Data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");
      const saved = await saveUploadedFile(buffer, input.filename, input.mimeType);
      const roomFile = await addRoomFile({
        roomCode: input.roomCode,
        originalName: input.filename,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        filePath: saved.relativeUrl
      });
      return roomFile;
    }),
    /**
     * Get room files list
     */
    getFiles: publicProcedure.input(z2.object({ roomCode: z2.string().min(6).max(6) })).query(async ({ input }) => {
      return await getRoomFiles(input.roomCode);
    })
  }),
  stats: router({
    /**
     * Dashboard platform overview metrics
     */
    getOverview: publicProcedure.query(async () => {
      return await getStatsOverview();
    }),
    /**
     * Track client actions (QR generation, OCR conversion)
     */
    trackAction: publicProcedure.input(
      z2.object({
        type: z2.enum(["qr", "ocr", "text", "file", "room"])
      })
    ).mutation(({ input }) => {
      if (input.type === "qr") incrementStat("qrGeneratedCount");
      if (input.type === "ocr") incrementStat("ocrConversionsCount");
      return { success: true };
    })
  }),
  contact: router({
    submit: publicProcedure.input(
      z2.object({
        name: z2.string().min(1, "Name is required").max(255),
        email: z2.string().email("Invalid email address").max(320),
        subject: z2.string().min(1, "Subject is required").max(500),
        message: z2.string().min(1, "Message is required").max(5e3)
      })
    ).mutation(async ({ input }) => {
      await createContactSubmission(input);
      return { success: true };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/api.ts
var app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
var trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext
});
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "quick-clipboard-serverless" });
});
app.use(trpcMiddleware);
var api_default = app;
export {
  api_default as default
};
