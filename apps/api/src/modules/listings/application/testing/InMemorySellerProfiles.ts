import type {
  CardSeller,
  SellerProfile,
  SellerProfilePort,
} from "../../domain/ports/SellerProfilePort";

/** In-memory `SellerProfilePort` keyed by User id. */
export class InMemorySellerProfiles implements SellerProfilePort {
  readonly profiles: Map<string, SellerProfile>;
  /** Batched card-seller reads so far; a feed page should cost one. */
  cardSellerReads = 0;

  constructor(profiles: Iterable<[string, SellerProfile]> = []) {
    this.profiles = new Map(profiles);
  }

  async getSellerProfile(userId: string): Promise<SellerProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async getCardSellers(userIds: string[]): Promise<Map<string, CardSeller>> {
    this.cardSellerReads += 1;
    const sellers = new Map<string, CardSeller>();
    for (const id of userIds) {
      const profile = this.profiles.get(id);
      if (profile) {
        sellers.set(id, {
          displayName: profile.displayName,
          nameNumber: profile.nameNumber,
          deleted: profile.deleted,
        });
      }
    }
    return sellers;
  }
}
