import { Inject, Injectable } from "@nestjs/common";
import type { UserRepository } from "../domain/ports/UserRepository";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";

export interface GetMeInput {
  userId: string;
}

export interface GetMeResult {
  id: string;
  phone: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  locale: string | null;
  createdAt: string;
}

@Injectable()
export class GetMe {
  constructor(
    @Inject(PrismaUserRepository)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: GetMeInput): Promise<GetMeResult> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
