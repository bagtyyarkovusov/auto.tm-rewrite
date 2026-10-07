import { Inject, Injectable } from "@nestjs/common";

import type { IdentityCheckPort } from "../domain/ports/IdentityCheckPort";
import { PROFILE_PHOTO_PORT, type ProfilePhotoPort } from "../domain/ports/ProfilePhotoPort";
import type { UserRepository } from "../domain/ports/UserRepository";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";

export interface RemoveProfilePhotoInput {
  userId: string;
}

@Injectable()
export class RemoveProfilePhoto {
  constructor(
    @Inject(PrismaUserRepository)
    private readonly userRepo: UserRepository,
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(PROFILE_PHOTO_PORT)
    private readonly photos: ProfilePhotoPort,
  ) {}

  async execute(_input: RemoveProfilePhotoInput): Promise<void> {
    // Skeleton for the failing-test checkpoint (#642); no behaviour yet.
  }
}
