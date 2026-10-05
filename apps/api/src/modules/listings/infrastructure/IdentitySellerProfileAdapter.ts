import { Inject, Injectable } from "@nestjs/common";

import {
  SELLER_PROFILE_READ_PORT,
  type SellerProfileReadPort,
} from "../../identity/identity.public";
import type {
  SellerProfile,
  SellerProfilePort,
} from "../domain/ports/SellerProfilePort";

@Injectable()
export class IdentitySellerProfileAdapter implements SellerProfilePort {
  constructor(
    @Inject(SELLER_PROFILE_READ_PORT)
    private readonly identityProfiles: SellerProfileReadPort,
  ) {}

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    const profile = await this.identityProfiles.getSellerProfile(userId);
    if (!profile) return null;
    return {
      displayName: profile.displayName,
      nameNumber: profile.nameNumber,
      avatarIndex: profile.avatarIndex,
      avatarKey: profile.avatarKey,
      deleted: profile.deleted,
      memberSince: profile.memberSince,
    };
  }
}
