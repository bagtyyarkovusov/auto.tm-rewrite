import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@auto-tm/db";
import {
  assertLiveUserSignInMethods,
  assertSignInMethodsVerified,
  NO_SIGN_IN_METHODS,
  type SignInMethods,
} from "../domain/SignInMethods";
import type { User } from "../domain/User";
import type { UserRepository } from "../domain/ports/UserRepository";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(signInMethods: SignInMethods): Promise<User> {
    assertLiveUserSignInMethods(signInMethods);
    const row = await this.prisma.user.create({
      data: {
        phone: signInMethods.phone,
        phoneVerifiedAt: signInMethods.phoneVerifiedAt,
        email: signInMethods.email,
        emailVerifiedAt: signInMethods.emailVerifiedAt,
      },
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

  async purgePersonalData(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...NO_SIGN_IN_METHODS,
        displayName: null,
        avatarUrl: null,
      },
    });
  }

  private toDomain(
    row: Awaited<ReturnType<PrismaService["user"]["create"]>>,
  ): User {
    const signInMethods: SignInMethods = {
      phone: row.phone,
      phoneVerifiedAt: row.phoneVerifiedAt,
      email: row.email,
      emailVerifiedAt: row.emailVerifiedAt,
    };
    assertSignInMethodsVerified(signInMethods);
    return {
      id: row.id,
      ...signInMethods,
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
