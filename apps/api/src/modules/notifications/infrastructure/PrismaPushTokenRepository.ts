import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import { PushToken } from "../domain/PushToken";
import type { PushPlatform } from "../domain/types";
import type { PushTokenRepository } from "../domain/ports/PushTokenRepository";

@Injectable()
export class PrismaPushTokenRepository implements PushTokenRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async findByToken(token: string): Promise<PushToken | null> {
    const row = await this.prisma.fcmDevice.findUnique({
      where: { token },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findById(id: string): Promise<PushToken | null> {
    const row = await this.prisma.fcmDevice.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async listActiveForUser(userId: string): Promise<PushToken[]> {
    const rows = await this.prisma.fcmDevice.findMany({
      where: {
        userId,
        invalidatedAt: null,
      },
      orderBy: { lastUsedAt: "desc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(token: PushToken): Promise<void> {
    await this.prisma.fcmDevice.upsert({
      where: { token: token.token },
      create: {
        id: token.id,
        userId: token.userId,
        token: token.token,
        platform: token.platform,
        deviceId: token.deviceId,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        registeredAt: token.createdAt,
        lastUsedAt: token.lastSeenAt,
        invalidatedAt: token.invalidatedAt,
      },
      update: {
        userId: token.userId,
        platform: token.platform,
        deviceId: token.deviceId,
        updatedAt: token.updatedAt,
        lastUsedAt: token.lastSeenAt,
        invalidatedAt: token.invalidatedAt,
      },
    });
  }

  async update(token: PushToken): Promise<void> {
    await this.save(token);
  }

  private toDomain(row: {
    id: string;
    userId: string;
    token: string;
    platform: string;
    createdAt: Date;
    updatedAt: Date;
    deviceId: string | null;
    lastUsedAt: Date;
    invalidatedAt: Date | null;
  }): PushToken {
    return PushToken.create({
      id: row.id,
      userId: row.userId,
      token: row.token,
      platform: row.platform as PushPlatform,
      deviceId: row.deviceId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastSeenAt: row.lastUsedAt,
      invalidatedAt: row.invalidatedAt,
    });
  }
}
