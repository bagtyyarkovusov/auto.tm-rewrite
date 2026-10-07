import { Inject, Injectable } from "@nestjs/common";

import type { IdentityCheckPort } from "../domain/ports/IdentityCheckPort";
import { PROFILE_PHOTO_PORT, type ProfilePhotoPort } from "../domain/ports/ProfilePhotoPort";
import type { UserRepository } from "../domain/ports/UserRepository";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";

export interface SetProfilePhotoInput {
  userId: string;
  key: string;
}

@Injectable()
export class SetProfilePhoto {
  constructor(
    @Inject(PrismaUserRepository)
    private readonly userRepo: UserRepository,
    @Inject(IDENTITY_TOKENS.IdentityCheckPort)
    private readonly identityCheck: IdentityCheckPort,
    @Inject(PROFILE_PHOTO_PORT)
    private readonly photos: ProfilePhotoPort,
  ) {}

  async execute(_input: SetProfilePhotoInput): Promise<void> {
    // Skeleton for the failing-test checkpoint (#642); no behaviour yet.
  }
}
