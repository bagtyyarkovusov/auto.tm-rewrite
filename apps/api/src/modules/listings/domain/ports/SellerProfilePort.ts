export interface SellerProfile {
  displayName: string | null;
  memberSince: Date;
}

export interface SellerProfilePort {
  getSellerProfile(userId: string): Promise<SellerProfile | null>;
}

export const SELLER_PROFILE_PORT = Symbol("SellerProfilePort");
