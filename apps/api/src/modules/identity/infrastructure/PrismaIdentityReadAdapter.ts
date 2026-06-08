import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type { IdentityReadPort } from "../domain/ports/IdentityReadPort";

@Injectable()
export class PrismaIdentityReadAdapter implements IdentityReadPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUserById(
    id: string,
  ): Promise<{
    id: string;
    displayName: string | null;
    role: string;
    suspendedAt: Date | null;
  } | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        role: true,
        suspendedAt: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      displayName: row.displayName,
      role: row.role,
      suspendedAt: row.suspendedAt,
    };
  }
}
