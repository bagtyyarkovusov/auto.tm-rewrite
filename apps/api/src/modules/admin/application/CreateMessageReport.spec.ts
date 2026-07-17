import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

import { ContentReport } from "../domain/ContentReport";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import type {
  ConversationReportContextPort,
  MessageReportContext,
} from "../../conversations/domain/ports/ConversationReportContextPort";
import { AdminSchemas } from "@auto-tm/contracts";

import { CreateMessageReport } from "./CreateMessageReport";

class FakeContentReportRepository implements ContentReportRepository {
  reports: ContentReport[] = [];

  async save(report: ContentReport): Promise<ContentReport> {
    this.reports.push(report);
    return report;
  }

  async findById(_id: string): Promise<ContentReport | null> {
    return null;
  }

  async findPendingByReporterAndTarget(
    reporterUserId: string,
    targetType: string,
    targetId: string,
  ): Promise<ContentReport | null> {
    return (
      this.reports.find(
        (r) =>
          r.reporterUserId === reporterUserId &&
          r.targetType === targetType &&
          r.targetId === targetId &&
          r.status === "pending",
      ) ?? null
    );
  }

  async findMany(): Promise<{ items: ContentReport[]; total: number }> {
    return { items: [], total: 0 };
  }

  async countPendingByTarget(): Promise<number> {
    return 0;
  }

  async countByReporter(): Promise<number> {
    return 0;
  }

  async updateStatus(): Promise<ContentReport> {
    throw new Error("Not implemented");
  }
}

class FakeIdentityReadPort implements IdentityReadPort {
  users: Record<string, { id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null }> = {};

  async findUserById(id: string): Promise<{ id: string; displayName: string | null; role: string; suspendedAt: Date | null; suspendedById: string | null; suspensionReason: string | null } | null> {
    return this.users[id] ?? null;
  }

  async findUsersByIds(): Promise<[]> {
    return [];
  }

  async isUserBlockedBy(): Promise<boolean> {
    return false;
  }

  seed(id: string, user: { displayName?: string | null; role?: string; suspendedAt?: Date | null }) {
    this.users[id] = {
      id,
      displayName: user.displayName ?? null,
      role: user.role ?? "buyer",
      suspendedAt: user.suspendedAt ?? null,
      suspendedById: null,
      suspensionReason: null,
    };
  }
}

class FakeConversationReportContextPort
  implements ConversationReportContextPort
{
  contexts: Record<string, MessageReportContext> = {};
  participants: Set<string> = new Set();

  async getMessageReportContext(input: {
    conversationId: string;
    messageId: string;
  }): Promise<MessageReportContext | null> {
    return this.contexts[`${input.conversationId}:${input.messageId}`] ?? null;
  }

  async isParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    return this.participants.has(`${conversationId}:${userId}`);
  }

  seedContext(context: MessageReportContext) {
    this.contexts[`${context.conversationId}:${context.messageId}`] = context;
  }

  seedParticipant(conversationId: string, userId: string) {
    this.participants.add(`${conversationId}:${userId}`);
  }
}

class FakeEventEmitter {
  events: Array<{ event: string; payload: unknown }> = [];

  emit(event: string, payload: unknown): void {
    this.events.push({ event, payload });
  }
}

function makeContext(
  conversationId: string,
  messageId: string,
  senderId: string,
  opts: { deletedAt?: Date; body?: string } = {},
): MessageReportContext {
  return {
    messageId,
    conversationId,
    listingId: "listing-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    senderId,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    body: opts.body ?? "Hello",
    deletedAt: opts.deletedAt ?? null,
    surroundingMessages: [],
  };
}

function makeRequest(
  reason: AdminSchemas.MessageReportReason = AdminSchemas.MessageReportReason.Spam,
  opts: { details?: string } = {},
): AdminSchemas.CreateMessageReportRequest {
  return {
    reason,
    ...(opts.details ? { details: opts.details } : {}),
  };
}

function makeUseCase(
  repo?: FakeContentReportRepository,
  identity?: FakeIdentityReadPort,
  context?: FakeConversationReportContextPort,
  events?: FakeEventEmitter,
) {
  return new CreateMessageReport(
    repo ?? new FakeContentReportRepository(),
    identity ?? new FakeIdentityReadPort(),
    context ?? new FakeConversationReportContextPort(),
    (events ?? new FakeEventEmitter()) as unknown as ConstructorParameters<typeof CreateMessageReport>[3],
  );
}

describe("CreateMessageReport", () => {
  let repo: FakeContentReportRepository;
  let identity: FakeIdentityReadPort;
  let context: FakeConversationReportContextPort;
  let events: FakeEventEmitter;

  beforeEach(() => {
    repo = new FakeContentReportRepository();
    identity = new FakeIdentityReadPort();
    context = new FakeConversationReportContextPort();
    events = new FakeEventEmitter();
  });

  it("creates a new message report for a participant", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      request: makeRequest(),
    });

    expect(result.reusedExisting).toBe(false);
    expect(result.report.targetType).toBe("message");
    expect(result.report.targetId).toBe("msg-1");
    expect(result.report.messageContext?.conversationId).toBe("conv-1");
    expect(repo.reports).toHaveLength(1);
  });

  it("emits ContentReportCreated for a new report", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    await uc.execute({
      reporterUserId: "reporter-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      request: makeRequest(),
    });

    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      event: "ContentReportCreated",
      payload: {
        targetType: "message",
        targetId: "msg-1",
        reporterUserId: "reporter-1",
        reason: "spam",
      },
    });
  });

  it("reuses an existing pending report and emits no event", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    const first = await uc.execute({
      reporterUserId: "reporter-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      request: makeRequest(),
    });

    const second = await uc.execute({
      reporterUserId: "reporter-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      request: makeRequest(),
    });

    expect(second.reusedExisting).toBe(true);
    expect(second.report.id).toBe(first.report.id);
    expect(repo.reports).toHaveLength(1);
    expect(events.events).toHaveLength(1);
  });

  it("returns NOT_FOUND for missing message", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        conversationId: "conv-1",
        messageId: "missing-msg",
        request: makeRequest(),
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns FORBIDDEN for non-participant reporter", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));

    const uc = makeUseCase(repo, identity, context, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        conversationId: "conv-1",
        messageId: "msg-1",
        request: makeRequest(),
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("returns SELF_REPORT_NOT_ALLOWED for own message", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "reporter-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    try {
      await uc.execute({
        reporterUserId: "reporter-1",
        conversationId: "conv-1",
        messageId: "msg-1",
        request: makeRequest(),
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as BadRequestException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("VALIDATION_FAILED");
      expect(response["details"]).toMatchObject({
        reason: "SELF_REPORT_NOT_ALLOWED",
      });
    }
  });

  it("returns USER_SUSPENDED for suspended reporter", async () => {
    identity.seed("reporter-1", { role: "buyer", suspendedAt: new Date() });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    try {
      await uc.execute({
        reporterUserId: "reporter-1",
        conversationId: "conv-1",
        messageId: "msg-1",
        request: makeRequest(),
      });
      expect.fail("should have thrown");
    } catch (err) {
      const ex = err as ForbiddenException;
      const response = ex.getResponse() as Record<string, unknown>;
      expect(response["code"]).toBe("FORBIDDEN");
      expect(response["details"]).toMatchObject({
        reason: "USER_SUSPENDED",
      });
    }
  });

  it("preserves context for a deleted message", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(
      makeContext("conv-1", "msg-1", "seller-1", {
        deletedAt: new Date("2026-01-01T12:05:00Z"),
        body: "Deleted body",
      }),
    );
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      request: makeRequest(),
    });

    expect(result.report.messageContext?.deletedAt).toEqual(
      new Date("2026-01-01T12:05:00Z"),
    );
    expect(result.report.messageContext?.body).toBe("Deleted body");
  });

  it("requires details for other reason", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        conversationId: "conv-1",
        messageId: "msg-1",
        request: makeRequest(AdminSchemas.MessageReportReason.Other),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects wrong_category for message reports", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    await expect(
      uc.execute({
        reporterUserId: "reporter-1",
        conversationId: "conv-1",
        messageId: "msg-1",
        request: {
          reason: "wrong_category" as unknown as AdminSchemas.MessageReportReason,
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("allows harassment reason for message reports", async () => {
    identity.seed("reporter-1", { role: "buyer" });
    context.seedContext(makeContext("conv-1", "msg-1", "seller-1"));
    context.seedParticipant("conv-1", "reporter-1");

    const uc = makeUseCase(repo, identity, context, events);
    const result = await uc.execute({
      reporterUserId: "reporter-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      request: makeRequest(AdminSchemas.MessageReportReason.Harassment),
    });

    expect(result.report.reason).toBe("harassment");
  });
});
