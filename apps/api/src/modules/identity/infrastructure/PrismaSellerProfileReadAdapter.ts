import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type {
  SellerProfile,
  SellerProfileReadPort,
} from "../domain/ports/SellerProfileReadPort";

@Injectable()
export class PrismaSellerProfileReadAdapter implements SellerProfileReadPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSellerProfiles(userIds: string[]): Promise<Map<string, SellerProfile>> {
    if (userIds.length === 0) return new Map();

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(userIds)] } },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
        phoneVerifiedAt: true,
      },
    });

    return new Map(
      users.map((user) => [
        user.id,
        {
          displayName: user.displayName,
          memberSince: user.createdAt,
          phoneVerified: user.phoneVerifiedAt !== null,
        },
      ]),
    );
  }
}
