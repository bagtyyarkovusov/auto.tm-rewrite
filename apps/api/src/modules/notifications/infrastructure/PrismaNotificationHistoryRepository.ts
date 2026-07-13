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

  async save(notification: DirectMessageNotification): Promise<void> {
    await this.prisma.notificationHistory.create({
      data: {
        userId: notification.userId,
        category: notification.category,
        title: notification.title,
        body: notification.body,
        data: notification.data as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
