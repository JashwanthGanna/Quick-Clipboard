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
  /** Whether self-destruct mode is enabled (delete after first view) */
  selfDestruct: int("selfDestruct").default(0).notNull(),
  /** Whether this clipboard has been viewed */
  viewed: int("viewed").default(0).notNull(),
  /** Timestamp when the clipboard was created */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Timestamp when the clipboard expires (24 hours after creation) */
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Clipboard = typeof clipboards.$inferSelect;
export type InsertClipboard = typeof clipboards.$inferInsert;

// Type override to ensure content is always a string
export type ClipboardWithContent = Clipboard & { content: string };

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