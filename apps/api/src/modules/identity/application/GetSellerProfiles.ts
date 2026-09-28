import { Inject, Injectable } from "@nestjs/common";

import {
  SELLER_PROFILE_READ_PORT,
  type SellerProfile,
  type SellerProfileReadPort,
} from "../domain/ports/SellerProfileReadPort";

/** Public identity read for the seller name and join date shown on Listings. */
@Injectable()
export class GetSellerProfiles {
  constructor(
    @Inject(SELLER_PROFILE_READ_PORT)
    private readonly profiles: SellerProfileReadPort,
  ) {}

  async execute(userIds: string[]): Promise<Map<string, SellerProfile>> {
    return this.profiles.getSellerProfiles(userIds);
  }
}
