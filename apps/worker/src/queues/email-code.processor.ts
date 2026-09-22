import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { UnrecoverableError, type Job } from "bullmq";
import { AuthSchemas } from "@auto-tm/contracts";

import { SendSignInCodeEmail } from "../email/application/SendSignInCodeEmail";

/** `a***@example.com`: enough to tell recipients apart in logs, not to read them. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at < 1) return "***";
  return `${address[0]}***${address.slice(at)}`;
}

/**
 * Consumes `email-code` jobs (ADR-0055). The job data holds the Sign-in Code,
 * so it is never logged: log lines carry the job ID, a masked recipient, the
 * purpose and provider error codes only. Permanent failures throw
 * `UnrecoverableError`, which BullMQ fails without using remaining attempts.
 */
@Processor(AuthSchemas.EMAIL_CODE_QUEUE)
export class EmailCodeProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailCodeProcessor.name);

  constructor(
    @Inject(SendSignInCodeEmail)
    private readonly sendSignInCodeEmail: SendSignInCodeEmail,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== AuthSchemas.EMAIL_CODE_JOB_NAME) {
      throw new UnrecoverableError(`unhandled email-code job name ${job.name}`);
    }
    if (job.id === undefined) {
      throw new UnrecoverableError("email-code job has no ID to use as idempotency key");
    }

    const parsed = AuthSchemas.EmailCodeJobSchema.safeParse(job.data);
    if (!parsed.success) {
      // Only field paths: Zod issue messages can quote the rejected value.
      const fields = parsed.error.issues.map((issue) => issue.path.join("."));
      this.logger.error({ jobId: job.id, fields }, "[email-code] invalid payload");
      throw new UnrecoverableError(`invalid email-code payload: ${fields.join(", ")}`);
    }

    const { to, code, locale, purpose } = parsed.data;
    const context = { jobId: job.id, to: maskEmail(to), purpose, attempt: job.attemptsMade + 1 };

    const outcome = await this.sendSignInCodeEmail.execute({
      jobId: job.id,
      to,
      code,
      locale,
      purpose,
    });

    switch (outcome.status) {
      case "sent":
        this.logger.log(context, "[email-code] sent");
        return;
      case "cap-reached":
        this.logger.error(
          { ...context, alert: "EMAIL_DAILY_CAP_REACHED", cap: outcome.cap },
          `[email-code] ALERT daily email cap of ${outcome.cap} reached; not sending`,
        );
        throw new UnrecoverableError(`daily email cap of ${outcome.cap} reached`);
      case "rejected":
        this.logger.error({ ...context, cause: outcome.cause }, "[email-code] rejected by provider");
        throw new UnrecoverableError(`email rejected by provider: ${outcome.cause}`);
      case "retryable":
        this.logger.warn({ ...context, cause: outcome.cause }, "[email-code] retryable send failure");
        throw new Error(`retryable email send failure: ${outcome.cause}`);
    }
  }
}
