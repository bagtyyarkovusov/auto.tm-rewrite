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

export interface SellerProfilePort {
  getSellerProfile(userId: string): Promise<SellerProfile | null>;
}

export const SELLER_PROFILE_PORT = Symbol("SellerProfilePort");
