import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createClipboard, getClipboardByCode, markClipboardAsViewed, createContactSubmission } from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  clipboard: router({
    /**
     * Create and send a clipboard entry
     * Returns the unique 6-digit code for retrieval
     */
    send: publicProcedure
      .input(
        z.object({
          content: z.string().min(1),
          selfDestruct: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const code = await createClipboard(input.content, input.selfDestruct);
        return {
          code,
          expiresIn: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        };
      }),

    /**
     * Retrieve clipboard content by code
     * Returns the content and metadata
     */
    retrieve: publicProcedure
      .input(z.object({ code: z.string().length(6) }))
      .query(async ({ input }) => {
        const clipboard = await getClipboardByCode(input.code);
        if (!clipboard) {
          return null;
        }

        // Mark as viewed (will delete if self-destruct is enabled)
        await markClipboardAsViewed(input.code);

        return {
          content: clipboard.content,
          selfDestruct: clipboard.selfDestruct === 1,
          viewed: clipboard.viewed === 1,
          createdAt: clipboard.createdAt,
          expiresAt: clipboard.expiresAt,
        };
      }),

    /**
     * Get clipboard info without marking as viewed
     * Used for checking if a clipboard exists before retrieving
     */
    info: publicProcedure
      .input(z.object({ code: z.string().length(6) }))
      .query(async ({ input }) => {
        const clipboard = await getClipboardByCode(input.code);
        if (!clipboard) {
          return null;
        }

        return {
          exists: true,
          selfDestruct: clipboard.selfDestruct === 1,
          viewed: clipboard.viewed === 1,
          expiresAt: clipboard.expiresAt,
        };
      }),
  }),

  contact: router({
    /**
     * Submit a contact form message
     * Stores the submission in the database
     */
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
