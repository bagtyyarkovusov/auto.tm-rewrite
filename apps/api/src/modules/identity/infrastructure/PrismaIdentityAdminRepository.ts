import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { IdentityAdminPort } from "../domain/ports/IdentityAdminPort";

@Injectable()
export class PrismaIdentityAdminRepository implements IdentityAdminPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async suspendUser(
    userId: string,
    adminUserId: string,
    reason: string,
    tx?: unknown,
  ): Promise<{
    suspendedAt: Date;
    suspendedById: string;
    suspensionReason: string;
  }> {
    const client = this.getClient(tx);
    const now = new Date();
    const row = await client.user.update({
      where: { id: userId, suspendedAt: null },
      data: {
        suspendedAt: now,
        suspendedById: adminUserId,
        suspensionReason: reason,
      },
    });
    return {
      suspendedAt: row.suspendedAt as Date,
      suspendedById: row.suspendedById as string,
      suspensionReason: row.suspensionReason as string,
    };
  }

  async unsuspendUser(
    userId: string,
    tx?: unknown,
  ): Promise<{
    suspendedAt: null;
    suspendedById: null;
    suspensionReason: null;
  }> {
    const client = this.getClient(tx);
    const row = await client.user.update({
      where: { id: userId, suspendedAt: { not: null } },
      data: {
        suspendedAt: null,
        suspendedById: null,
        suspensionReason: null,
      },
    });
    return {
      suspendedAt: row.suspendedAt as null,
      suspendedById: row.suspendedById as null,
      suspensionReason: row.suspensionReason as null,
    };
  }

  async isSuspended(userId: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { suspendedAt: true },
    });
    return row?.suspendedAt != null;
  }

  private getClient(tx?: unknown): PrismaService {
    return (tx as PrismaService | undefined) ?? this.prisma;
  }
}
