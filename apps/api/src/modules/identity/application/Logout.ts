import { Inject, Injectable } from "@nestjs/common";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import { PrismaSessionRepository } from "../infrastructure/PrismaSessionRepository";

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class Logout {
  constructor(
    @Inject(PrismaSessionRepository)
    private readonly sessionRepo: SessionRepository,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const lookup = await this.sessionRepo.findByRefreshToken(input.refreshToken);
    if (!lookup) {
      throw new Error("Invalid refresh token");
    }

    await this.sessionRepo.delete(lookup.session.id);
  }
}
