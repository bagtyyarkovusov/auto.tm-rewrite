import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import type { User } from "../domain/User";
import type { UserRepository } from "../domain/ports/UserRepository";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(input: { phone: string }): Promise<User> {
    const row = await this.prisma.user.create({
      data: { phone: input.phone },
    });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async scheduleDeletion(userId: string, deletionScheduledAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionScheduledAt },
    });
  }

  async clearDeletionSchedule(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionScheduledAt: null },
    });
  }

  async findUsersWithExpiredDeletionGrace(now: Date): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      where: { deletionScheduledAt: { lte: now } },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async tombstoneUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: `deleted:${userId}`,
        displayName: null,
        avatarUrl: null,
      },
    });
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["user"]["create"]>>,
  ): User {
    return {
      id: row.id,
      phone: row.phone,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      locale: row.locale,
      role: row.role as User["role"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletionScheduledAt: row.deletionScheduledAt ?? null,
    };
  }
}
