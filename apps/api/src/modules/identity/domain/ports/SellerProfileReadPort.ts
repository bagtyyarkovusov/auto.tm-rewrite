export interface SellerProfile {
  displayName: string | null;
  memberSince: Date;
}

/** Public seller facts for other contexts; exposes no Sign-in Method data. */
export interface SellerProfileReadPort {
  getSellerProfile(userId: string): Promise<SellerProfile | null>;
}

export const SELLER_PROFILE_READ_PORT = Symbol("SellerProfileReadPort");
