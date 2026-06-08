import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

export interface UnsuspendUserAccountInput {
  userId: string;
}

export interface UnsuspendUserAccountResult {
  suspendedAt: null;
  suspendedById: null;
  suspensionReason: null;
}

@Injectable()
export class UnsuspendUserAccount {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: UnsuspendUserAccountInput): Promise<UnsuspendUserAccountResult> {
    const row = await this.prisma.user.update({
      where: { id: input.userId, suspendedAt: { not: null } },
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
}
