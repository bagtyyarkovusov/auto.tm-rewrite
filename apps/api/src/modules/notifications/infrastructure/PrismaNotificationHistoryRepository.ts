import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import type { DirectMessageNotification } from "../domain/DirectMessageNotification";
import type { NotificationHistoryRepository } from "../domain/ports/NotificationHistoryRepository";

@Injectable()
export class PrismaNotificationHistoryRepository
  implements NotificationHistoryRepository
{
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async save(notification: DirectMessageNotification): Promise<{ id: string }> {
    const row = await this.prisma.notificationHistory.create({
      data: {
        userId: notification.userId,
        category: notification.category,
        status: "pending",
        title: notification.title,
        body: notification.body,
        // The value object is built from JSON-serializable primitives only.
        data: notification.data as unknown as Prisma.InputJsonValue,
      },
    });

    return { id: row.id };
  }
}
