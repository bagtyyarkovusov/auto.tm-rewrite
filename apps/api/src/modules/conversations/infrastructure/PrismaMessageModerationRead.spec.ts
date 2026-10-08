import { describe, expect, it } from "vitest";
import type { PrismaService } from "@auto-tm/db";

import { PrismaConversationRepository } from "./PrismaConversationRepository";

describe("reported Message attachments", () => {
  it.each([["text", false], ["post_ref", false], ["image", true]] as const)("labels %s as attachment=%s", async (kind, hasAttachment) => {
    const prisma = { message: { findUnique: async () => ({
      id: "m1", senderId: "sender", body: null, kind,
      createdAt: new Date("2026-01-01T12:00:00Z"), deletedAt: null,
    }) } } as unknown as PrismaService;
    const message = await new PrismaConversationRepository(prisma).getReportedMessage("m1");
    expect(message?.hasAttachment).toBe(hasAttachment);
  });
});
