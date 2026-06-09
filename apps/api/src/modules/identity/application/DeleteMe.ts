import { Inject, Injectable } from "@nestjs/common";
import type { UserRepository } from "../domain/ports/UserRepository";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import type { AccountDeletionListingsPort } from "../domain/ports/AccountDeletionListingsPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";
import { PrismaSessionRepository } from "../infrastructure/PrismaSessionRepository";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";
import { ACCOUNT_DELETION_LISTINGS_PORT } from "../domain/ports/AccountDeletionListingsPort";

const GRACE_PERIOD_DAYS = 30;

export interface DeleteMeInput {
  userId: string;
}

@Injectable()
export class DeleteMe {
  constructor(
    @Inject(PrismaUserRepository)
    private readonly userRepo: UserRepository,
    @Inject(PrismaSessionRepository)
    private readonly sessionRepo: SessionRepository,
    @Inject(ACCOUNT_DELETION_LISTINGS_PORT)
    private readonly listingsPort: AccountDeletionListingsPort,
    @Inject(SystemClockAdapter)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: DeleteMeInput): Promise<void> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = this.clock.now();
    const deletionScheduledAt = new Date(
      now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.userRepo.scheduleDeletion(input.userId, deletionScheduledAt);
    await this.sessionRepo.deleteAllByUserId(input.userId);
    await this.listingsPort.archiveActiveListingsBySeller(input.userId);
  }
}
