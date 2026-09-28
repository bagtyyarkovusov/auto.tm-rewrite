import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type {
  SellerProfile,
  SellerProfileReadPort,
} from "../domain/ports/SellerProfileReadPort";

@Injectable()
export class PrismaSellerProfileReadAdapter implements SellerProfileReadPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, createdAt: true },
    });
    return user ? { displayName: user.displayName, memberSince: user.createdAt } : null;
  }
}
