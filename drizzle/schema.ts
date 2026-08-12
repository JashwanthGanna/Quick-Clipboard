import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clipboards table for storing shared text content.
 * Each entry has a unique 6-digit code for retrieval.
 * Entries expire after 24 hours and can be auto-deleted after viewing (self-destruct mode).
 */
export const clipboards = mysqlTable("clipboards", {
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
  expiresAt: timestamp("expiresAt"),
});

export type Clipboard = typeof clipboards.$inferSelect;
export type InsertClipboard = typeof clipboards.$inferInsert;
export type ClipboardWithContent = Clipboard & { content: string };

/**
 * Shared files table supporting images, PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, ZIP, TXT up to 50MB.
 */
export const files = mysqlTable("files", {
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
  expiresAt: timestamp("expiresAt"),
});

export type SharedFile = typeof files.$inferSelect;
export type InsertSharedFile = typeof files.$inferInsert;

/**
 * Collaboration rooms for real-time clipboard, notes, and file sharing.
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }),
  isLocked: int("isLocked").default(0).notNull(),
  ownerToken: varchar("ownerToken", { length: 64 }).notNull(),
  clipboardText: text("clipboardText").default("").notNull(),
  notes: text("notes").default("").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type SharedRoom = typeof rooms.$inferSelect;
export type InsertSharedRoom = typeof rooms.$inferInsert;

/**
 * Files uploaded within a specific shared room.
 */
export const roomFiles = mysqlTable("room_files", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 6 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: int("fileSize").notNull(),
  filePath: text("filePath").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoomFile = typeof roomFiles.$inferSelect;
export type InsertRoomFile = typeof roomFiles.$inferInsert;

/**
 * Platform analytics and usage statistics.
 */
export const analyticsStats = mysqlTable("analytics_stats", {
  id: int("id").autoincrement().primaryKey(),
  filesSharedCount: int("filesSharedCount").default(0).notNull(),
  textSharesCount: int("textSharesCount").default(0).notNull(),
  qrGeneratedCount: int("qrGeneratedCount").default(0).notNull(),
  ocrConversionsCount: int("ocrConversionsCount").default(0).notNull(),
  roomsCreatedCount: int("roomsCreatedCount").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Contact form submissions table.
 * Stores messages from the contact page for review.
 */
export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;