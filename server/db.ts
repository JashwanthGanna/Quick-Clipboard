import { eq, gt, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, clipboards, contactSubmissions } from "../drizzle/schema";
import { ENV } from './_core/env';

import type { Clipboard } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
      values.role = 'admin';
      updateSet.role = 'admin';
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
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// In-memory fallback storage for when DATABASE_URL is not configured locally
type InMemoryClipboard = {
  id: number;
  code: string;
  content: string;
  selfDestruct: number;
  viewed: number;
  createdAt: Date;
  expiresAt: Date;
};

const memoryClipboards = new Map<string, InMemoryClipboard>();
let memoryClipboardIdCounter = 1;

const memoryContactSubmissions: Array<{
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}> = [];
let memoryContactIdCounter = 1;

// Clipboard helper functions
export async function createClipboard(content: string, selfDestruct: boolean): Promise<string> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const db = await getDb();

  if (!db) {
    let code: string;
    let attempts = 0;
    do {
      code = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");
      attempts++;
    } while (memoryClipboards.has(code) && attempts < 100);

    memoryClipboards.set(code, {
      id: memoryClipboardIdCounter++,
      code,
      content,
      selfDestruct: selfDestruct ? 1 : 0,
      viewed: 0,
      createdAt: new Date(),
      expiresAt,
    });

    return code;
  }

  // Generate a unique 6-digit code
  let code: string;
  let isUnique = false;
  const maxAttempts = 100;
  let attempts = 0;

  do {
    code = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    
    // Check if code is unique
    const existing = await db
      .select()
      .from(clipboards)
      .where(eq(clipboards.code, code))
      .limit(1);
    
    isUnique = existing.length === 0;
    attempts++;
  } while (!isUnique && attempts < maxAttempts);

  if (!isUnique) {
    throw new Error("Failed to generate unique code");
  }

  // Insert the clipboard entry
  await db.insert(clipboards).values({
    code,
    content,
    selfDestruct: selfDestruct ? 1 : 0,
    viewed: 0,
    expiresAt,
  });

  return code;
}

export async function getClipboardByCode(code: string) {
  const db = await getDb();
  if (!db) {
    const clipboard = memoryClipboards.get(code);
    if (!clipboard) {
      return null;
    }
    if (new Date() > clipboard.expiresAt) {
      memoryClipboards.delete(code);
      return null;
    }
    return clipboard;
  }

  const result = await db
    .select()
    .from(clipboards)
    .where(eq(clipboards.code, code))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const clipboard = result[0];

  // Check if expired
  if (new Date() > clipboard.expiresAt) {
    // Delete expired clipboard
    await db.delete(clipboards).where(eq(clipboards.code, code));
    return null;
  }

  return clipboard;
}

export async function markClipboardAsViewed(code: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    const clipboard = memoryClipboards.get(code);
    if (!clipboard) return;

    if (clipboard.selfDestruct) {
      memoryClipboards.delete(code);
    } else {
      clipboard.viewed = 1;
    }
    return;
  }

  const clipboard = await getClipboardByCode(code);
  if (!clipboard) {
    return;
  }

  // If self-destruct is enabled, delete the clipboard
  if (clipboard.selfDestruct) {
    await db.delete(clipboards).where(eq(clipboards.code, code));
  } else {
    // Otherwise just mark as viewed
    await db
      .update(clipboards)
      .set({ viewed: 1 })
      .where(eq(clipboards.code, code));
  }
}

export async function deleteExpiredClipboards(): Promise<void> {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    memoryClipboards.forEach((item, code) => {
      if (now > item.expiresAt) {
        memoryClipboards.delete(code);
      }
    });
    return;
  }

  await db.delete(clipboards).where(lt(clipboards.expiresAt, new Date()));
}

export async function createContactSubmission(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    memoryContactSubmissions.push({
      id: memoryContactIdCounter++,
      ...data,
      createdAt: new Date(),
    });
    return;
  }

  await db.insert(contactSubmissions).values({
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
  });
}
