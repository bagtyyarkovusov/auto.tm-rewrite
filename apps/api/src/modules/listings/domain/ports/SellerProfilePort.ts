export interface SellerProfile {
  displayName: string | null;
  memberSince: Date;
  phoneVerified: boolean;
}

export interface SellerProfilePort {
  getSellerProfile(userId: string): Promise<SellerProfile | null>;
  getSellerProfiles(userIds: string[]): Promise<Map<string, SellerProfile>>;
}

export const SELLER_PROFILE_PORT = Symbol("SellerProfilePort");
