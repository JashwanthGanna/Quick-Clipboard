import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  createClipboard: vi.fn(async (content: string, selfDestruct: boolean) => {
    if (!content) throw new Error("Content is required");
    return "123456";
  }),
  getClipboardByCode: vi.fn(async (code: string) => {
    if (code === "123456") {
      return {
        id: 1,
        code: "123456",
        content: "Test content",
        selfDestruct: 0,
        viewed: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
    return null;
  }),
  getFileByCode: vi.fn(async () => null),
  markClipboardAsViewed: vi.fn(async () => {}),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("clipboard procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createPublicContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("clipboard.send", () => {
    it("should create a clipboard and return a 6-digit code", async () => {
      const result = await caller.clipboard.send({
        content: "Hello, World!",
        selfDestruct: false,
      });

      expect(result.code).toBe("123456");
      expect(result.shareUrl).toBe("/share/123456");
    });

    it("should reject empty content", async () => {
      try {
        await caller.clipboard.send({
          content: "",
          selfDestruct: false,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Content cannot be empty");
      }
    });

    it("should accept self-destruct flag", async () => {
      const result = await caller.clipboard.send({
        content: "Secret message",
        selfDestruct: true,
      });

      expect(result.code).toBe("123456");
    });
  });

  describe("clipboard.retrieve", () => {
    it("should retrieve clipboard content by code", async () => {
      const result = await caller.clipboard.retrieve({
        code: "123456",
      });

      expect(result).not.toBeNull();
      if ("content" in result!) {
        expect(result.content).toBe("Test content");
        expect(result.selfDestruct).toBe(false);
      }
    });

    it("should return error object for non-existent code", async () => {
      const result = await caller.clipboard.retrieve({
        code: "999999",
      });

      expect(result).toHaveProperty("error");
    });

    it("should reject invalid code format", async () => {
      try {
        await caller.clipboard.retrieve({
          code: "12345", // Only 5 digits
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Too small");
      }
    });
  });

  describe("clipboard.info", () => {
    it("should return clipboard metadata without marking as viewed", async () => {
      const result = await caller.clipboard.info({
        code: "123456",
      });

      expect(result).not.toBeNull();
      expect(result?.exists).toBe(true);
      expect(result?.selfDestruct).toBe(false);
    });

    it("should return null for non-existent code", async () => {
      const result = await caller.clipboard.info({
        code: "999999",
      });

      expect(result).toBeNull();
    });
  });
});
