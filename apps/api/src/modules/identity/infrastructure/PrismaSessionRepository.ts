import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { Session } from "../domain/Session";
import type { SessionRepository } from "../domain/ports/SessionRepository";

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    deviceLabel: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<Session> {
    const row = await this.prisma.session.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        deviceLabel: input.deviceLabel,
        userAgent: input.userAgent,
        expiresAt: input.expiresAt,
      },
    });
    return this.toDomain(row);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.session.count({ where: { userId } });
  }

  async deleteExpiredByUserId(userId: string): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  async deleteOldestByUserId(userId: string): Promise<void> {
    const oldest = await this.prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (oldest) {
      await this.prisma.session.delete({ where: { id: oldest.id } });
    }
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["session"]["create"]>>,
  ): Session {
    return {
      id: row.id,
      userId: row.userId,
      refreshTokenHash: row.refreshTokenHash,
      deviceLabel: row.deviceLabel,
      userAgent: row.userAgent,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
    };
  }
}
