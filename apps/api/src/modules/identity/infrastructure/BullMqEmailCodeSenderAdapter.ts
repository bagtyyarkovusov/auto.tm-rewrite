import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { AuthSchemas } from "@auto-tm/contracts";

import type { EmailCodeSenderPort } from "../domain/ports/EmailCodeSenderPort";

export const EMAIL_CODE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 1_000 },
} as const;

@Injectable()
export class BullMqEmailCodeSenderAdapter implements EmailCodeSenderPort {
  constructor(
    @InjectQueue(AuthSchemas.EMAIL_CODE_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(input: {
    requestId: string;
    email: string;
    code: string;
    locale: "ru" | "tk" | "en";
  }): Promise<void> {
    await this.queue.add(
      AuthSchemas.EMAIL_CODE_JOB_NAME,
      {
        to: input.email,
        code: input.code,
        locale: input.locale,
        purpose: "sign-in",
      },
      { ...EMAIL_CODE_JOB_OPTIONS, jobId: input.requestId },
    );
  }
}
