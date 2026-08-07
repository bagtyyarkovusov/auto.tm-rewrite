import {
  Controller,
  Get,
  Inject,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";

import { getDeployMetadata } from "./deploy-metadata";
import { Public } from "./public.decorator";
import { ReadinessService } from "./readiness.service";

@Controller()
export class HealthController {
  constructor(
    @Inject(ReadinessService) private readonly readiness: ReadinessService,
  ) {}

  /**
   * Liveness: dependency-free. Never touches Postgres, Redis, or MinIO so a
   * dead dependency cannot restart-loop the process.
   */
  @Public()
  @Get("healthz")
  healthz() {
    return {
      status: "ok",
      service: "api",
      ...getDeployMetadata(process.env),
    };
  }

  /**
   * Readiness: bounded dependency check (Postgres, Redis, MinIO). Returns
   * 503 with per-check statuses when any dependency is down; response never
   * contains connection strings, credentials, or raw error messages.
   */
  @Public()
  @Get("readyz")
  async readyz(@Res({ passthrough: true }) response: FastifyReply) {
    const result = await this.readiness.check();
    const body = {
      status: result.ready ? "ready" : "not_ready",
      service: "api",
      checks: result.checks,
      ...getDeployMetadata(process.env),
    };

    if (!result.ready) {
      response.status(503);
    }

    return body;
  }
}
