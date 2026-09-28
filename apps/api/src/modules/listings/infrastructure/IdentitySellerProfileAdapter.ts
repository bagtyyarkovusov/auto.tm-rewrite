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

  getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return this.identityProfiles.getSellerProfile(userId);
  }
}
