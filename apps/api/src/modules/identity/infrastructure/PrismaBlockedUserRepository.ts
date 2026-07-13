import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import { randomUUID } from "node:crypto";

import { BlockedUser } from "../domain/BlockedUser";
import type {
  BlockedUserRepository,
} from "../domain/ports/BlockedUserRepository";

@Injectable()
export class PrismaBlockedUserRepository implements BlockedUserRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async block(blockerId: string, blockedId: string): Promise<BlockedUser> {
    const row = await this.prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        blockerId,
        blockedId,
      },
    });

    return this.toDomain(row);
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.blockedUser.deleteMany({
      where: {
        blockerId,
        blockedId,
      },
    });
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const row = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
    return row !== null;
  }

  private toDomain(row: {
    id: string;
    blockerId: string;
    blockedId: string;
    createdAt: Date;
  }): BlockedUser {
    return BlockedUser.create({
      id: row.id,
      blockerId: row.blockerId,
      blockedId: row.blockedId,
      createdAt: row.createdAt,
    });
  }
}
