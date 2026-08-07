import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@auto-tm/db";
import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { Redis } from "ioredis";

import type { Env } from "../env.schema";
import {
  runReadinessChecks,
  type ReadinessResult,
} from "./readiness";

/** Per-check probe budget; /readyz stays bounded at ~this value. */
const READINESS_CHECK_TIMEOUT_MS = 1500;

/**
 * Builds the real Postgres / Redis / MinIO probes behind /readyz. Probe
 * failures are logged server-side (where connection details may appear) but
 * the HTTP response only ever carries per-check "ok" | "failed" statuses.
 */
@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async check(): Promise<ReadinessResult> {
    const result = await runReadinessChecks(
      {
        postgres: () => this.checkPostgres(),
        redis: () => this.checkRedis(),
        minio: () => this.checkMinio(),
      },
      READINESS_CHECK_TIMEOUT_MS,
    );

    if (!result.ready) {
      this.logger.warn(
        `Readiness failed: ${JSON.stringify(result.checks)}`,
      );
    }

    return result;
  }

  private async checkPostgres(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    const redis = new Redis(this.config.get("REDIS_URL", { infer: true }), {
      lazyConnect: true,
      connectTimeout: READINESS_CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    // ioredis emits "error" on failed connects; without a listener the
    // process would crash on an unhandled error event.
    redis.on("error", () => undefined);
    try {
      await redis.connect();
      await redis.ping();
    } finally {
      redis.disconnect();
    }
  }

  private async checkMinio(): Promise<void> {
    const s3 = new S3Client({
      endpoint: this.config.get("MINIO_ENDPOINT", { infer: true }),
      region: this.config.get("MINIO_REGION", { infer: true }),
      credentials: {
        accessKeyId: this.config.get("MINIO_ACCESS_KEY", { infer: true }),
        secretAccessKey: this.config.get("MINIO_SECRET_KEY", { infer: true }),
      },
      forcePathStyle: true,
    });
    try {
      // Server reachability + credential validity only; bucket bootstrap is
      // owned by S11-02 and is intentionally not part of readiness.
      await s3.send(new ListBucketsCommand({}), {
        abortSignal: AbortSignal.timeout(READINESS_CHECK_TIMEOUT_MS),
      });
    } finally {
      s3.destroy();
    }
  }
}
