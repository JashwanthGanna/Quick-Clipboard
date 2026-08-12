import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createClipboard,
  getClipboardByCode,
  markClipboardAsViewed,
  createFile,
  getFileByCode,
  registerFileDownload,
  createRoom,
  getRoomByCode,
  addRoomFile,
  getRoomFiles,
  getStatsOverview,
  incrementStat,
  createContactSubmission,
} from "./db";
import { saveUploadedFile, validateFileTypeAndSize } from "./fileStorage";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  clipboard: router({
    /**
     * Create and send a text clipboard entry
     */
    send: publicProcedure
      .input(
        z.object({
          content: z.string().min(1, "Content cannot be empty"),
          selfDestruct: z.boolean().default(false),
          destructMode: z.enum(["view", "download", "time", "none"]).optional(),
          password: z.string().optional(),
          maxViews: z.number().min(1).max(1000).optional(),
          maxDownloads: z.number().min(1).max(1000).optional(),
          expiryOption: z.enum(["10m", "1h", "24h", "7d", "never"]).default("24h"),
        })
      )
      .mutation(async ({ input }) => {
        const code = await createClipboard({
          content: input.content,
          selfDestruct: input.selfDestruct,
          destructMode: input.destructMode,
          password: input.password || undefined,
          maxViews: input.maxViews,
          maxDownloads: input.maxDownloads,
          expiryOption: input.expiryOption,
        });

        return {
          code,
          shareUrl: `/share/${code}`,
        };
      }),

    /**
     * Retrieve clipboard content by code
    /**
     * Retrieve clipboard content by code (with automatic file fallback)
     */
    retrieve: publicProcedure
      .input(
        z.object({
          code: z.string().min(6).max(6),
          password: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const clipboard = await getClipboardByCode(input.code);
        if (!clipboard) {
          const file = await getFileByCode(input.code);
          if (file) {
            if (file.password && file.password !== input.password) {
              return {
                requiresPassword: true,
                isPasswordValid: false,
                error: "Password required to view/download file.",
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
              expiresAt: file.expiresAt,
            };
          }
          return { error: "Content not found or has expired." };
        }

        if (clipboard.password && clipboard.password !== input.password) {
          return {
            requiresPassword: true,
            isPasswordValid: false,
            error: "Password required to view content.",
          };
        }

        // Mark as viewed and handle self-destruct check
        const destructed = await markClipboardAsViewed(input.code);

        return {
          content: clipboard.content,
          selfDestruct: Boolean(clipboard.selfDestruct),
          destructMode: clipboard.destructMode,
          viewCount: clipboard.viewCount + 1,
          maxViews: clipboard.maxViews,
          createdAt: clipboard.createdAt,
          expiresAt: clipboard.expiresAt,
          isDestructedNow: destructed,
        };
      }),

    /**
     * Get clipboard info without deleting or marking viewed
     */
    info: publicProcedure
      .input(z.object({ code: z.string().min(6).max(6) }))
      .query(async ({ input }) => {
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
          expiresAt: clipboard.expiresAt,
        };
      }),
  }),

  file: router({
    /**
     * Upload a shared file (base64 encoded)
     */
    upload: publicProcedure
      .input(
        z.object({
          filename: z.string().min(1),
          mimeType: z.string().min(1),
          fileSize: z.number().min(1),
          base64Data: z.string().min(1),
          password: z.string().optional(),
          selfDestruct: z.boolean().default(false),
          destructMode: z.enum(["view", "download", "time", "none"]).optional(),
          maxViews: z.number().optional(),
          maxDownloads: z.number().optional(),
          expiryOption: z.enum(["10m", "1h", "24h", "7d", "never"]).default("24h"),
        })
      )
      .mutation(async ({ input }) => {
        // Validate file type & size
        const validation = validateFileTypeAndSize(input.filename, input.fileSize);
        if (!validation.valid) {
          throw new Error(validation.error || "Invalid file upload");
        }

        // Convert base64 data to buffer and save to local disk
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
          expiryOption: input.expiryOption,
        });

        return {
          code,
          shareUrl: `/share/${code}`,
          filePath: saved.relativeUrl,
        };
      }),

    /**
     * Get shared file info by code (with automatic clipboard fallback)
     */
    retrieve: publicProcedure
      .input(
        z.object({
          code: z.string().min(6).max(6),
          password: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const file = await getFileByCode(input.code);
        if (!file) {
          const clipboard = await getClipboardByCode(input.code);
          if (clipboard) {
            if (clipboard.password && clipboard.password !== input.password) {
              return {
                requiresPassword: true,
                isPasswordValid: false,
                error: "Password required to view content.",
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
              expiresAt: clipboard.expiresAt,
            };
          }
          return { error: "File or clipboard not found, or has expired." };
        }

        if (file.password && file.password !== input.password) {
          return {
            requiresPassword: true,
            isPasswordValid: false,
            error: "Password required to view/download file.",
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
          expiresAt: file.expiresAt,
        };
      }),

    /**
     * Register a download and handle self-destruct countdown
     */
    registerDownload: publicProcedure
      .input(z.object({ code: z.string().min(6).max(6) }))
      .mutation(async ({ input }) => {
        const destructed = await registerFileDownload(input.code);
        return { isDestructedNow: destructed };
      }),
  }),

  room: router({
    /**
     * Create a real-time room
     */
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Room name is required").max(100),
          password: z.string().optional(),
          expiryOption: z.enum(["10m", "1h", "24h", "7d", "never"]).default("24h"),
          ownerToken: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const { code, room } = await createRoom({
          name: input.name,
          password: input.password,
          expiryOption: input.expiryOption,
          ownerToken: input.ownerToken,
        });

        return {
          code,
          roomUrl: `/room/${code}`,
          room,
        };
      }),

    /**
     * Get details for joining room
     */
    info: publicProcedure
      .input(z.object({ code: z.string().min(6).max(6) }))
      .query(async ({ input }) => {
        const room = await getRoomByCode(input.code);
        if (!room) return null;

        return {
          name: room.name,
          requiresPassword: Boolean(room.password),
          isLocked: Boolean(room.isLocked),
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
        };
      }),

    /**
     * Upload file to room feed
     */
    uploadFile: publicProcedure
      .input(
        z.object({
          roomCode: z.string().min(6).max(6),
          filename: z.string().min(1),
          mimeType: z.string().min(1),
          fileSize: z.number().min(1),
          base64Data: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const validation = validateFileTypeAndSize(input.filename, input.fileSize);
        if (!validation.valid) {
          throw new Error(validation.error || "Invalid room file upload");
        }

        const base64Clean = input.base64Data.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Clean, "base64");
        const saved = await saveUploadedFile(buffer, input.filename);

        const roomFile = await addRoomFile({
          roomCode: input.roomCode,
          originalName: input.filename,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          filePath: saved.relativeUrl,
        });

        return roomFile;
      }),

    /**
     * Get room files list
     */
    getFiles: publicProcedure
      .input(z.object({ roomCode: z.string().min(6).max(6) }))
      .query(async ({ input }) => {
        return await getRoomFiles(input.roomCode);
      }),
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
    trackAction: publicProcedure
      .input(
        z.object({
          type: z.enum(["qr", "ocr", "text", "file", "room"]),
        })
      )
      .mutation(({ input }) => {
        if (input.type === "qr") incrementStat("qrGeneratedCount");
        if (input.type === "ocr") incrementStat("ocrConversionsCount");
        return { success: true };
      }),
  }),

  contact: router({
    submit: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required").max(255),
          email: z.string().email("Invalid email address").max(320),
          subject: z.string().min(1, "Subject is required").max(500),
          message: z.string().min(1, "Message is required").max(5000),
        })
      )
      .mutation(async ({ input }) => {
        await createContactSubmission(input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
