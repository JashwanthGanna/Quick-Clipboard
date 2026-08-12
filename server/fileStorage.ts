import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOAD_DIR = isVercel ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads");

try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  const fallbackDir = path.join(os.tmpdir(), "uploads");
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
}

export const ALLOWED_EXTENSIONS = [
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
  ".txt",
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

export function validateFileTypeAndSize(filename: string, fileSize: number): { valid: boolean; error?: string } {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type "${ext}". Supported types: JPG, PNG, WEBP, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, TXT.`,
    };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of 50MB (uploaded: ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }
  return { valid: true };
}

export async function saveUploadedFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType?: string
): Promise<{ filename: string; relativeUrl: string; filePath: string }> {
  const ext = path.extname(originalFilename).toLowerCase();
  const safeHash = crypto.randomBytes(8).toString("hex");
  const storedFilename = `${Date.now()}_${safeHash}${ext}`;

  const effectiveMime = mimeType || "application/octet-stream";
  const dataUrl = `data:${effectiveMime};base64,${buffer.toString("base64")}`;

  try {
    const uploadDir = path.join(os.tmpdir(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, storedFilename);
    await fs.promises.writeFile(localFilePath, buffer);
  } catch (err) {
    console.warn("Serverless mode disk write skipped, using Data URL fallback", err);
  }

  return {
    filename: storedFilename,
    relativeUrl: dataUrl,
    filePath: dataUrl,
  };
}

export function getUploadPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}
