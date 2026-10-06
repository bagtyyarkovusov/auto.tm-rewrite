import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

import type {
  SellerProfile,
  SellerProfileReadPort,
} from "../domain/ports/SellerProfileReadPort";
import { PUBLIC_IDENTITY_SELECT, toPublicIdentity } from "./publicIdentityRow";

@Injectable()
export class PrismaSellerProfileReadAdapter implements SellerProfileReadPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_IDENTITY_SELECT, createdAt: true },
    });
    return user ? { ...toPublicIdentity(user), memberSince: user.createdAt } : null;
  }
}
