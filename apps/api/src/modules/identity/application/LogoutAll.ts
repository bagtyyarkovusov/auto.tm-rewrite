import { Inject, Injectable } from "@nestjs/common";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import { PrismaSessionRepository } from "../infrastructure/PrismaSessionRepository";

export interface LogoutAllInput {
  userId: string;
}

@Injectable()
export class LogoutAll {
  constructor(
    @Inject(PrismaSessionRepository)
    private readonly sessionRepo: SessionRepository,
  ) {}

  async execute(input: LogoutAllInput): Promise<void> {
    await this.sessionRepo.deleteAllByUserId(input.userId);
  }
}
