import type {
  SellerProfile,
  SellerProfilePort,
} from "../domain/ports/SellerProfilePort";

export class FakeSellerProfilePort implements SellerProfilePort {
  profiles = new Map<string, SellerProfile>();
  batchCalls = 0;

  constructor() {
    this.profiles.set("user-1", {
      displayName: "Seller",
      memberSince: new Date("2025-01-01T00:00:00.000Z"),
      phoneVerified: true,
    });
  }

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async getSellerProfiles(userIds: string[]): Promise<Map<string, SellerProfile>> {
    this.batchCalls += 1;
    return new Map(
      userIds.flatMap((id) => {
        const profile = this.profiles.get(id);
        return profile ? [[id, profile] as const] : [];
      }),
    );
  }
}
