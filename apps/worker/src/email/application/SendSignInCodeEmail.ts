import { Inject, Injectable } from "@nestjs/common";

import type { DailySendCap } from "../domain/DailySendCap";
import { DAILY_SEND_CAP } from "../domain/DailySendCap";
import type { EmailSenderPort } from "../domain/EmailSenderPort";
import { EMAIL_SENDER_PORT } from "../domain/EmailSenderPort";
import {
  renderSignInCodeEmail,
  type SignInCodeEmailInput,
} from "../domain/renderSignInCodeEmail";
import { EMAIL_SEND_FAILURE } from "../domain/types";

export interface SendSignInCodeEmailInput extends SignInCodeEmailInput {
  /** The BullMQ job ID: the idempotency key and the daily-cap slot. */
  jobId: string;
}

export type SendSignInCodeEmailOutcome =
  | { status: "sent" }
  | { status: "cap-reached"; cap: number }
  | { status: "rejected"; cause: string }
  | { status: "retryable"; cause: string };

@Injectable()
export class SendSignInCodeEmail {
  constructor(
    @Inject(EMAIL_SENDER_PORT)
    private readonly sender: EmailSenderPort,
    @Inject(DAILY_SEND_CAP)
    private readonly dailyCap: DailySendCap,
  ) {}

  async execute(
    input: SendSignInCodeEmailInput,
    now: Date = new Date(),
  ): Promise<SendSignInCodeEmailOutcome> {
    const decision = await this.dailyCap.reserve(input.jobId, now);
    if (!decision.allowed) {
      return { status: "cap-reached", cap: decision.cap };
    }

    const result = await this.sender.send(renderSignInCodeEmail(input), {
      idempotencyKey: input.jobId,
    });

    if (result.ok) return { status: "sent" };
    if (result.reason === EMAIL_SEND_FAILURE.Rejected) {
      return { status: "rejected", cause: result.cause };
    }
    return { status: "retryable", cause: result.cause };
  }
}
