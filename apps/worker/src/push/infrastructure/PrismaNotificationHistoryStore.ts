import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import type {
  NotificationHistoryStatus,
  NotificationHistoryStore,
} from "../domain/NotificationHistoryStore";

@Injectable()
export class PrismaNotificationHistoryStore implements NotificationHistoryStore {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async updateStatus(
    historyId: string,
    status: NotificationHistoryStatus,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.notificationHistory.update({
      where: { id: historyId },
      data: {
        status,
        deliveryDetails: details as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
