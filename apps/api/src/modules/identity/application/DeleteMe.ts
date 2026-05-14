import { Inject, Injectable } from "@nestjs/common";
import type { UserRepository } from "../domain/ports/UserRepository";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";

export interface DeleteMeInput {
  userId: string;
}

@Injectable()
export class DeleteMe {
  constructor(
    @Inject(PrismaUserRepository)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(input: DeleteMeInput): Promise<void> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await this.userRepo.delete(input.userId);
  }
}
