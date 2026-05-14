import { Body, Controller, Post, BadRequestException, Req, Inject } from "@nestjs/common";
import { AuthSchemas } from "@auto-tm/contracts";
import type { FastifyRequest } from "fastify";
import { Public } from "../../../common/public.decorator";
import { RequestOtp } from "../application/RequestOtp";

@Controller("api/v1/auth")
export class AuthController {
  constructor(@Inject(RequestOtp) private readonly requestOtp: RequestOtp) {}

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
}
