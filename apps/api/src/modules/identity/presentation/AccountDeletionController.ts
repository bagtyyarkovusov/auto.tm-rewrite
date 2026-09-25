import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthSchemas } from "@auto-tm/contracts";

import { Public } from "../../../common/public.decorator";
import { RequestAccountDeletion } from "../application/RequestAccountDeletion";
import { ConfirmAccountDeletion } from "../application/ConfirmAccountDeletion";

type LocalizedRequest = FastifyRequest & { locale?: "ru" | "tk" | "en" };

const CODE_ERRORS: Record<string, { code: string; message: string }> = {
  "OTP code has expired": {
    code: "OTP_EXPIRED",
    message: "The code has expired. Please request a new one.",
  },
  "OTP code has already been used": {
    code: "OTP_ALREADY_USED",
    message: "This code has already been used.",
  },
  "Invalid OTP code": {
    code: "INVALID_OTP",
    message: "Invalid code. Please try again.",
  },
  "Too many attempts": {
    code: "OTP_LOCKED",
    message: "Too many failed attempts. Please request a new code.",
  },
  "No Sign-in Code request found": {
    code: "OTP_NOT_FOUND",
    message: "No code request found. Please request a code first.",
  },
};

/**
 * Public account deletion without the app (ADR-0054, Google Play). Responses
 * never reveal whether a User holds the phone or email.
 */
@Controller("api/v1/account-deletion")
export class AccountDeletionController {
  constructor(
    @Inject(RequestAccountDeletion)
    private readonly requestAccountDeletion: RequestAccountDeletion,
    @Inject(ConfirmAccountDeletion)
    private readonly confirmAccountDeletion: ConfirmAccountDeletion,
  ) {}

  @Public()
  @Post("request")
  async request(@Body() body: unknown, @Req() req: LocalizedRequest) {
    const parsed = AuthSchemas.AccountDeletionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Invalid account deletion request",
        details: parsed.error.flatten(),
      });
    }

    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.ip
      ?? "127.0.0.1";
    const locale = req.locale ?? "ru";

    try {
      return await this.requestAccountDeletion.execute(
        "phone" in parsed.data
          ? { phone: parsed.data.phone, ip, locale }
          : { email: parsed.data.email, ip, locale },
      );
    } catch (error) {
      this.throwCodeError(error);
    }
  }

  @Public()
  @Post("confirm")
  @HttpCode(204)
  async confirm(@Body() body: unknown): Promise<void> {
    const parsed = AuthSchemas.AccountDeletionConfirmRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Invalid account deletion confirmation",
        details: parsed.error.flatten(),
      });
    }

    try {
      await this.confirmAccountDeletion.execute(
        "phone" in parsed.data
          ? { phone: parsed.data.phone, code: parsed.data.code }
          : { email: parsed.data.email, code: parsed.data.code },
      );
    } catch (error) {
      this.throwCodeError(error);
    }
  }

  private throwCodeError(error: unknown): never {
    if (error instanceof Error && error.message === "Too many OTP requests") {
      throw new BadRequestException({
        code: "RATE_LIMITED",
        message: "Too many code requests. Please wait before trying again.",
      });
    }
    if (
      error instanceof Error &&
      (error.message.startsWith("Phone must be") ||
        error.message.startsWith("Email must be"))
    ) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: error.message,
      });
    }
    if (error instanceof Error && CODE_ERRORS[error.message]) {
      throw new BadRequestException(CODE_ERRORS[error.message]);
    }
    throw error;
  }
}
