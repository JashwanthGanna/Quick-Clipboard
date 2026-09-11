import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let db: Firestore | null = null;
let isInitialized = false;

function initFirebase(): Firestore | null {
  if (isInitialized) return db;
  isInitialized = true;

  try {
    if (getApps().length > 0) {
      db = getFirestore();
      return db;
    }

    let serviceAccount: any = null;

    // 1. Check process environment variables
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

    // 2. Check local workspace root for serviceAccountKey.json or firebase-key.json
    if (!serviceAccount) {
      const possiblePaths = [
        path.join(process.cwd(), "serviceAccountKey.json"),
        path.join(process.cwd(), "serviceAccount.json"),
        path.join(process.cwd(), "firebase-key.json"),
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
        credential: cert(serviceAccount),
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

export function getFirestoreDb(): Firestore | null {
  return initFirebase();
}

export interface FirebaseRoom {
  code: string;
  name: string;
  password?: string | null;
  isLocked: boolean;
  ownerToken: string;
  clipboardText: string;
  notes: string;
  createdAt: string;
  expiresAt: null;
}

export interface FirebaseRoomFile {
  id?: number | string;
  roomCode: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
}

// 1. Save Room
export async function saveFirebaseRoom(room: {
  code: string;
  name: string;
  password?: string | null;
  isLocked: number | boolean;
  ownerToken: string;
  clipboardText: string;
  notes: string;
  createdAt?: Date | string;
}): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    const data: FirebaseRoom = {
      code: room.code,
      name: room.name,
      password: room.password || null,
      isLocked: Boolean(room.isLocked),
      ownerToken: room.ownerToken,
      clipboardText: room.clipboardText,
      notes: room.notes,
      createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : new Date().toISOString(),
      expiresAt: null,
    };
    await fdb.collection("never_expire_rooms").doc(room.code).set(data);
  } catch (err) {
    console.error("[Firebase] Failed to save room to Firestore:", err);
  }
}

// 2. Get Room by Code
export async function getFirebaseRoomByCode(code: string): Promise<FirebaseRoom | null> {
  const fdb = getFirestoreDb();
  if (!fdb) return null;

  try {
    const doc = await fdb.collection("never_expire_rooms").doc(code).get();
    if (!doc.exists) return null;
    return doc.data() as FirebaseRoom;
  } catch (err) {
    console.error("[Firebase] Failed to get room from Firestore:", err);
    return null;
  }
}

// 3. Update Clipboard
export async function updateFirebaseRoomClipboard(code: string, text: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    await fdb.collection("never_expire_rooms").doc(code).update({
      clipboardText: text,
    });
  } catch (err) {
    // If doc doesn't exist, ignore
  }
}

// 4. Update Notes
export async function updateFirebaseRoomNotes(code: string, notes: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    await fdb.collection("never_expire_rooms").doc(code).update({
      notes,
    });
  } catch (err) {
    // If doc doesn't exist, ignore
  }
}

// 5. Update Lock Status
export async function updateFirebaseRoomLock(code: string, isLocked: boolean): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    await fdb.collection("never_expire_rooms").doc(code).update({
      isLocked: Boolean(isLocked),
    });
  } catch (err) {
    // If doc doesn't exist, ignore
  }
}

// 6. Regenerate Room Code
export async function regenerateFirebaseRoomCode(oldCode: string, newCode: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    const doc = await fdb.collection("never_expire_rooms").doc(oldCode).get();
    if (doc.exists) {
      const data = doc.data() as FirebaseRoom;
      data.code = newCode;
      await fdb.collection("never_expire_rooms").doc(newCode).set(data);
      await fdb.collection("never_expire_rooms").doc(oldCode).delete();
    }
  } catch (err) {
    console.error("[Firebase] Failed to regenerate room code in Firestore:", err);
  }
}

// 7. Delete Room
export async function deleteFirebaseRoom(code: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    await fdb.collection("never_expire_rooms").doc(code).delete();
  } catch (err) {
    console.error("[Firebase] Failed to delete room from Firestore:", err);
  }
}

// 8. Add Room File
export async function addFirebaseRoomFile(file: FirebaseRoomFile): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;

  try {
    await fdb.collection("never_expire_room_files").add({
      ...file,
      createdAt: file.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Firebase] Failed to add room file to Firestore:", err);
  }
}

// 9. Get Room Files
export async function getFirebaseRoomFiles(roomCode: string): Promise<FirebaseRoomFile[]> {
  const fdb = getFirestoreDb();
  if (!fdb) return [];

  try {
    const snapshot = await fdb
      .collection("never_expire_room_files")
      .where("roomCode", "==", roomCode)
      .get();

    const result: FirebaseRoomFile[] = [];
    snapshot.forEach((doc: any) => {
      const data = doc.data() as FirebaseRoomFile;
      result.push({
        ...data,
        id: doc.id,
      });
    });
    return result;
  } catch (err) {
    console.error("[Firebase] Failed to get room files from Firestore:", err);
    return [];
  }
}
