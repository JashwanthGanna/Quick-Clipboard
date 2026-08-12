import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
  originalFilename: string
): Promise<{ filename: string; relativeUrl: string; filePath: string }> {
  const ext = path.extname(originalFilename).toLowerCase();
  const safeHash = crypto.randomBytes(8).toString("hex");
  const storedFilename = `${Date.now()}_${safeHash}${ext}`;
  const filePath = path.join(UPLOAD_DIR, storedFilename);

  await fs.promises.writeFile(filePath, buffer);

  return {
    filename: storedFilename,
    relativeUrl: `/uploads/${storedFilename}`,
    filePath,
  };
}

export function getUploadPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}
