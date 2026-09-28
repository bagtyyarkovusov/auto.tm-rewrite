import { Inject, Injectable } from "@nestjs/common";

import { GetSellerProfiles } from "../../identity/identity.public";
import type {
  SellerProfile,
  SellerProfilePort,
} from "../domain/ports/SellerProfilePort";

@Injectable()
export class IdentitySellerProfileAdapter implements SellerProfilePort {
  constructor(
    @Inject(GetSellerProfiles)
    private readonly getSellerProfilesUseCase: GetSellerProfiles,
  ) {}

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return (await this.getSellerProfilesUseCase.execute([userId])).get(userId) ?? null;
  }
}
