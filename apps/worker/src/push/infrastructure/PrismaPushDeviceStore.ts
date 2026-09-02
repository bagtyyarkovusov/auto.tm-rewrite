import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type {
  ActivePushDevice,
  PushDeviceStore,
} from "../domain/PushDeviceStore";

@Injectable()
export class PrismaPushDeviceStore implements PushDeviceStore {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async listActiveForUser(userId: string): Promise<ActivePushDevice[]> {
    const rows = await this.prisma.fcmDevice.findMany({
      where: {
        userId,
        invalidatedAt: null,
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return rows.map((row) => ({
      token: row.token,
      platform: row.platform,
    }));
  }

  /**
   * `updateMany` rather than `update`: a concurrently deleted or re-registered
   * row would make `update` throw P2025, aborting the job before its history
   * row is written and causing a full re-send on the BullMQ retry.
   */
  async invalidateToken(token: string): Promise<void> {
    await this.prisma.fcmDevice.updateMany({
      where: { token, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
  }
}
