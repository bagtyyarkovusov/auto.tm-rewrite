import { Body, Controller, Post, BadRequestException, UnauthorizedException, Req, Inject } from "@nestjs/common";
import { AuthSchemas } from "@auto-tm/contracts";
import type { FastifyRequest } from "fastify";
import { Public } from "../../../common/public.decorator";
import { RequestOtp } from "../application/RequestOtp";
import { VerifyOtp } from "../application/VerifyOtp";
import { RefreshSession } from "../application/RefreshSession";

@Controller("api/v1/auth")
export class AuthController {
  constructor(
    @Inject(RequestOtp) private readonly requestOtp: RequestOtp,
    @Inject(VerifyOtp) private readonly verifyOtp: VerifyOtp,
    @Inject(RefreshSession) private readonly refreshSession: RefreshSession,
  ) {}

  @Public()
  @Post("otp/request")
  async otpRequest(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const parsed = AuthSchemas.OtpRequestRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Invalid phone number format",
        details: parsed.error.flatten(),
      });
    }

    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        ?? req.ip
        ?? "127.0.0.1";

      const result = await this.requestOtp.execute({
        phone: parsed.data.phone,
        ip,
      });

      return {
        requestId: result.requestId,
        resendInSeconds: result.resendInSeconds,
        ...(result.testCode !== undefined ? { testCode: result.testCode } : {}),
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Too many OTP requests") {
        throw new BadRequestException({
          code: "RATE_LIMITED",
          message: "Too many OTP requests. Please wait before trying again.",
        });
      }
      if (err instanceof Error && err.message.startsWith("Phone must be")) {
        throw new BadRequestException({
          code: "VALIDATION_FAILED",
          message: err.message,
        });
      }
      throw err;
    }
  }

  @Public()
  @Post("otp/verify")
  async otpVerify(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
  ) {
    const parsed = AuthSchemas.OtpVerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Invalid OTP verification request",
        details: parsed.error.flatten(),
      });
    }

    try {
      const userAgent = req.headers["user-agent"] as string | undefined;

      const result = await this.verifyOtp.execute({
        phone: parsed.data.phone,
        code: parsed.data.code,
        ...(parsed.data.deviceLabel !== undefined ? { deviceLabel: parsed.data.deviceLabel } : {}),
        ...(userAgent !== undefined ? { userAgent } : {}),
      });

      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "OTP code has expired") {
        throw new BadRequestException({
          code: "OTP_EXPIRED",
          message: "OTP code has expired. Please request a new one.",
        });
      }
      if (err instanceof Error && err.message === "OTP code has already been used") {
        throw new BadRequestException({
          code: "OTP_ALREADY_USED",
          message: "This code has already been used.",
        });
      }
      if (err instanceof Error && err.message === "Invalid OTP code") {
        throw new BadRequestException({
          code: "INVALID_OTP",
          message: "Invalid OTP code. Please try again.",
        });
      }
      if (err instanceof Error && err.message === "Too many attempts") {
        throw new BadRequestException({
          code: "OTP_LOCKED",
          message: "Too many failed attempts. Please request a new code.",
        });
      }
      if (err instanceof Error && err.message === "No OTP request found for this phone") {
        throw new BadRequestException({
          code: "OTP_NOT_FOUND",
          message: "No OTP request found. Please request a code first.",
        });
      }
      throw err;
    }
  }

  @Public()
  @Post("refresh")
  async refresh(@Body() body: unknown) {
    const parsed = AuthSchemas.RefreshRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Invalid refresh token format",
        details: parsed.error.flatten(),
      });
    }

    try {
      const result = await this.refreshSession.execute({
        refreshToken: parsed.data.refreshToken,
      });
      return result;
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Invalid refresh token") {
        throw new UnauthorizedException({
          code: "INVALID_REFRESH_TOKEN",
          message: "The refresh token is invalid or has been revoked.",
        });
      }
      if (err instanceof Error && err.message === "Session expired") {
        throw new UnauthorizedException({
          code: "SESSION_EXPIRED",
          message: "Your session has expired. Please log in again.",
        });
      }
      if (err instanceof Error && err.message === "Token already used") {
        throw new UnauthorizedException({
          code: "TOKEN_ALREADY_USED",
          message: "This refresh token has already been used.",
        });
      }
      throw err;
    }
  }
}
