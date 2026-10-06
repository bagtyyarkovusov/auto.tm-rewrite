/**
 * What a buyer may see of a Listing's seller: their public identity and join
 * date. `deleted` marks a seller purged after account deletion. No Sign-in
 * Method data.
 */
export interface SellerProfile {
  displayName: string | null;
  nameNumber: number;
  avatarIndex: number;
  avatarKey: string | null;
  deleted: boolean;
  memberSince: Date;
}

/**
 * What a listing card shows of its seller: enough to name them. A `deleted`
 * seller has no name. No avatar, join date or Sign-in Method data.
 */
export interface CardSeller {
  displayName: string | null;
  nameNumber: number;
  deleted: boolean;
}

export interface SellerProfilePort {
  getSellerProfile(userId: string): Promise<SellerProfile | null>;
  /**
   * Card sellers for a page of Listings in one read, keyed by User id. Ids
   * with no User are absent from the map.
   */
  getCardSellers(userIds: string[]): Promise<Map<string, CardSeller>>;
}

export const SELLER_PROFILE_PORT = Symbol("SellerProfilePort");
