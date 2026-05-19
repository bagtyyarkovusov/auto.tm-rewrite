import {
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = (request.headers["x-request-id"] as string) ?? "unknown";

    let status: number;
    let code: string;
    let message: string;
    let details: unknown;

    // Use duck-typing instead of instanceof because pnpm can create
    // multiple copies of @nestjs/common in memory, breaking instanceof checks.
    const isHttpException =
      exception instanceof HttpException ||
      (typeof exception === "object" &&
        exception !== null &&
        "getStatus" in exception &&
        typeof (exception as { getStatus: unknown }).getStatus ===
          "function" &&
        "getResponse" in exception &&
        typeof (exception as { getResponse: unknown }).getResponse ===
          "function");

    if (isHttpException) {
      status = (exception as HttpException).getStatus();
      const body = (exception as HttpException).getResponse();
      if (typeof body === "string") {
        code = "HTTP_ERROR";
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        code = (b["code"] as string) ?? "HTTP_ERROR";
        message = (b["message"] as string) ?? (exception as Error).message;
        details = b["details"];
      } else {
        code = "HTTP_ERROR";
        message = (exception as Error).message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = "INTERNAL_SERVER_ERROR";
      message = "An unexpected error occurred";
    }

    if (status >= 500) {
      this.logger.error(
        { requestId, code, message, details },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    reply.status(status).send({
      statusCode: status,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
