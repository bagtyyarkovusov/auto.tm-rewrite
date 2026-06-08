import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { TotpEnrollment } from "../domain/TotpEnrollment";
import type { TotpBackupCode } from "../domain/TotpBackupCode";
import type { TotpEnrollmentRepository } from "../domain/ports/TotpEnrollmentRepository";

@Injectable()
export class PrismaTotpEnrollmentRepository implements TotpEnrollmentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<TotpEnrollment | null> {
    const row = await this.prisma.totpEnrollment.findUnique({
      where: { userId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async createPending(
    userId: string,
    encryptedSecret: string,
  ): Promise<TotpEnrollment> {
    const row = await this.prisma.totpEnrollment.create({
      data: { userId, encryptedSecret },
    });
    return this.toDomain(row);
  }

  async markVerified(userId: string): Promise<void> {
    await this.prisma.totpEnrollment.update({
      where: { userId },
      data: { verifiedAt: new Date() },
    });
  }

  async addBackupCodes(
    enrollmentId: string,
    codeHashes: string[],
  ): Promise<void> {
    await this.prisma.totpBackupCode.createMany({
      data: codeHashes.map((codeHash) => ({ totpEnrollmentId: enrollmentId, codeHash })),
    });
  }

  async findBackupCodes(enrollmentId: string): Promise<TotpBackupCode[]> {
    const rows = await this.prisma.totpBackupCode.findMany({
      where: { totpEnrollmentId: enrollmentId },
    });
    return rows.map((r) => ({
      id: r.id,
      totpEnrollmentId: r.totpEnrollmentId,
      codeHash: r.codeHash,
      usedAt: r.usedAt,
    }));
  }

  async consumeBackupCode(
    enrollmentId: string,
    codeHash: string,
  ): Promise<boolean> {
    const result = await this.prisma.totpBackupCode.updateMany({
      where: { totpEnrollmentId: enrollmentId, codeHash, usedAt: null },
      data: { usedAt: new Date() },
    });
    return result.count === 1;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.totpEnrollment.deleteMany({ where: { userId } });
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["totpEnrollment"]["findUnique"]>>,
  ): TotpEnrollment {
    if (!row) throw new Error("Unexpected null row");
    return {
      id: row.id,
      userId: row.userId,
      encryptedSecret: row.encryptedSecret,
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
