import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import type {
  NotificationHistoryStatus,
  NotificationHistoryStore,
} from "../domain/NotificationHistoryStore";

interface PersistedTokenResult {
  token?: unknown;
  success?: unknown;
}

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

  async listSucceededTokens(historyId: string): Promise<string[]> {
    const row = await this.prisma.notificationHistory.findUnique({
      where: { id: historyId },
      select: { deliveryDetails: true },
    });

    return readSucceededTokens(row?.deliveryDetails);
  }
}

/**
 * `deliveryDetails` is free-form JSON written by earlier attempts, so it is
 * parsed defensively: an unreadable shape simply yields no skip list, which
 * degrades to the previous re-send behavior rather than dropping a push.
 */
export function readSucceededTokens(deliveryDetails: unknown): string[] {
  if (typeof deliveryDetails !== "object" || deliveryDetails === null) {
    return [];
  }

  const results = (deliveryDetails as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  return results
    .filter(
      (entry): entry is PersistedTokenResult =>
        typeof entry === "object" && entry !== null,
    )
    .filter((entry) => entry.success === true && typeof entry.token === "string")
    .map((entry) => entry.token as string);
}
