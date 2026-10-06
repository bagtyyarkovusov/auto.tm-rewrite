import { Inject, Injectable } from "@nestjs/common";

import {
  IDENTITY_READ_PORT,
  SELLER_PROFILE_READ_PORT,
  type IdentityReadPort,
  type SellerProfileReadPort,
} from "../../identity/identity.public";
import type {
  CardSeller,
  SellerProfile,
  SellerProfilePort,
} from "../domain/ports/SellerProfilePort";

@Injectable()
export class IdentitySellerProfileAdapter implements SellerProfilePort {
  constructor(
    @Inject(SELLER_PROFILE_READ_PORT)
    private readonly identityProfiles: SellerProfileReadPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
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

  /** One identity read for the whole page; only the naming fields leave identity's summary. */
  async getCardSellers(userIds: string[]): Promise<Map<string, CardSeller>> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return new Map();

    const users = await this.identityRead.findUsersByIds(ids);
    return new Map(
      users.map((user) => [
        user.id,
        {
          displayName: user.displayName,
          nameNumber: user.nameNumber,
          deleted: user.deleted,
        },
      ]),
    );
  }
}
