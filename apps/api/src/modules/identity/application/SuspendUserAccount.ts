import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";

export interface SuspendUserAccountInput {
  userId: string;
  adminUserId: string;
  reason: string;
}

export interface SuspendUserAccountResult {
  suspendedAt: Date;
  suspendedById: string;
  suspensionReason: string;
}

@Injectable()
export class SuspendUserAccount {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: SuspendUserAccountInput): Promise<SuspendUserAccountResult> {
    const row = await this.prisma.user.update({
      where: { id: input.userId, suspendedAt: null },
      data: {
        suspendedAt: new Date(),
        suspendedById: input.adminUserId,
        suspensionReason: input.reason,
      },
    });

    return {
      suspendedAt: row.suspendedAt as Date,
      suspendedById: row.suspendedById as string,
      suspensionReason: row.suspensionReason as string,
    };
  }
}
