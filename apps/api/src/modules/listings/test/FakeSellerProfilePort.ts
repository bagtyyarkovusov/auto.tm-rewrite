import type {
  SellerProfile,
  SellerProfilePort,
} from "../domain/ports/SellerProfilePort";

export class FakeSellerProfilePort implements SellerProfilePort {
  profiles = new Map<string, SellerProfile>();

  constructor() {
    this.profiles.set("user-1", {
      displayName: "Seller",
      memberSince: new Date("2025-01-01T00:00:00.000Z"),
    });
  }

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return this.profiles.get(userId) ?? null;
  }
}
