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

  async invalidateToken(token: string): Promise<void> {
    await this.prisma.fcmDevice.update({
      where: { token },
      data: { invalidatedAt: new Date() },
    });
  }
}
