import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomUUID } from "node:crypto";

import { AdminSchemas } from "@auto-tm/contracts";
import type { z } from "zod";

import type { IdentityReadPort } from "../../identity/domain/ports/IdentityReadPort";
import { IDENTITY_READ_PORT } from "../../identity/domain/ports/IdentityReadPort";
import type {
  ConversationReportContextPort,
  MessageReportContext,
} from "../../conversations/domain/ports/ConversationReportContextPort";
import { CONVERSATION_REPORT_CONTEXT_PORT } from "../../conversations/domain/ports/ConversationReportContextPort";

import { ContentReport } from "../domain/ContentReport";
import { DomainError } from "../domain/types";
import type { ContentReportRepository } from "../domain/ports/ContentReportRepository";
import { CONTENT_REPORT_REPOSITORY } from "../domain/ports/ContentReportRepository";

type CreateMessageReportRequest = z.infer<
  typeof AdminSchemas.CreateMessageReportRequestSchema
>;

export interface CreateMessageReportInput {
  reporterUserId: string;
  conversationId: string;
  messageId: string;
  request: CreateMessageReportRequest;
}

export interface CreateMessageReportResult {
  report: ContentReport;
  reusedExisting: boolean;
}

@Injectable()
export class CreateMessageReport {
  constructor(
    @Inject(CONTENT_REPORT_REPOSITORY)
    private readonly reportRepo: ContentReportRepository,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(CONVERSATION_REPORT_CONTEXT_PORT)
    private readonly conversationContext: ConversationReportContextPort,
    @Inject(EventEmitter2)
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: CreateMessageReportInput,
  ): Promise<CreateMessageReportResult> {
    const reporter = await this.identityRead.findUserById(input.reporterUserId);
    if (reporter?.suspendedAt) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "User is suspended",
        details: { reason: AdminSchemas.AdminErrorReason.UserSuspended },
      });
    }

    const context = await this.conversationContext.getMessageReportContext({
      conversationId: input.conversationId,
      messageId: input.messageId,
    });

    if (!context) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Message not found",
      });
    }

    const isParticipant = await this.conversationContext.isParticipant(
      input.conversationId,
      input.reporterUserId,
    );
    if (!isParticipant) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
      });
    }

    if (context.senderId === input.reporterUserId) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "You cannot report your own message",
        details: {
          reason: AdminSchemas.AdminErrorReason.SelfReportNotAllowed,
        },
      });
    }

    return this.upsertReport(input, context);
  }

  private async upsertReport(
    input: CreateMessageReportInput,
    context: MessageReportContext,
  ): Promise<CreateMessageReportResult> {
    const existing = await this.reportRepo.findPendingByReporterAndTarget(
      input.reporterUserId,
      "message",
      input.messageId,
    );

    if (existing) {
      return { report: existing, reusedExisting: true };
    }

    let report: ContentReport;
    try {
      report = ContentReport.create({
        id: randomUUID(),
        reporterUserId: input.reporterUserId,
        targetType: "message",
        targetId: input.messageId,
        reason: input.request.reason,
        details: input.request.details ?? null,
        messageContext: context,
      });
    } catch (err) {
      if (err instanceof DomainError) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: err.message,
          details: { reason: err.code },
        });
      }
      throw err;
    }

    const saved = await this.reportRepo.save(report);

    this.eventEmitter.emit("ContentReportCreated", {
      reportId: saved.id,
      targetType: saved.targetType,
      targetId: saved.targetId,
      reporterUserId: saved.reporterUserId,
      reason: saved.reason,
    });

    return { report: saved, reusedExisting: false };
  }
}
