import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { IdentityReadPort, IdentityUserSummary } from "../domain/ports/IdentityReadPort";

@Injectable()
export class PrismaIdentityReadAdapter implements IdentityReadPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserById(
    id: string,
  ): Promise<IdentityUserSummary | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        role: true,
        suspendedAt: true,
        suspendedById: true,
        suspensionReason: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      displayName: row.displayName,
      role: row.role,
      suspendedAt: row.suspendedAt,
      suspendedById: row.suspendedById,
      suspensionReason: row.suspensionReason,
    };
  }

  async findUsersByIds(ids: string[]): Promise<IdentityUserSummary[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        displayName: true,
        role: true,
        suspendedAt: true,
        suspendedById: true,
        suspensionReason: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      role: row.role,
      suspendedAt: row.suspendedAt,
      suspendedById: row.suspendedById,
      suspensionReason: row.suspensionReason,
    }));
  }
}
