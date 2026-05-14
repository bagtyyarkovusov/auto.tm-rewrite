import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { OtpRequest } from "../domain/OtpRequest";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";

@Injectable()
export class PrismaOtpRequestRepository implements OtpRequestRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: {
    phone: string;
    codeHash: string;
    expiresAt: Date;
    userId: string | null;
    ip: string;
  }): Promise<OtpRequest> {
    const row = await this.prisma.otpRequest.create({
      data: {
        phone: input.phone,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        userId: input.userId,
        ip: input.ip,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<OtpRequest | null> {
    const row = await this.prisma.otpRequest.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async countByPhoneSince(phone: string, since: Date): Promise<number> {
    return this.prisma.otpRequest.count({
      where: { phone, createdAt: { gte: since } },
    });
  }

  async countByIpSince(ip: string, since: Date): Promise<number> {
    return this.prisma.otpRequest.count({
      where: { ip, createdAt: { gte: since } },
    });
  }

  async findLatestByPhone(phone: string): Promise<OtpRequest | null> {
    const row = await this.prisma.otpRequest.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.toDomain(row) : null;
  }

  async markVerified(id: string, userId: string): Promise<OtpRequest> {
    const row = await this.prisma.otpRequest.update({
      where: { id },
      data: { verifiedAt: new Date(), userId },
    });
    return this.toDomain(row);
  }

  async incrementAttempts(id: string): Promise<OtpRequest> {
    const row = await this.prisma.otpRequest.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
    return this.toDomain(row);
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["otpRequest"]["create"]>>,
  ): OtpRequest {
    return {
      id: row.id,
      phone: row.phone,
      codeHash: row.codeHash,
      expiresAt: row.expiresAt,
      verifiedAt: row.verifiedAt,
      attempts: row.attempts,
      userId: row.userId,
      ip: row.ip,
      createdAt: row.createdAt,
    };
  }
}
