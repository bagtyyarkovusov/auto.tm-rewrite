export interface SellerProfile {
  displayName: string | null;
  memberSince: Date;
}

export interface SellerProfileReadPort {
  getSellerProfiles(userIds: string[]): Promise<Map<string, SellerProfile>>;
}

export const SELLER_PROFILE_READ_PORT = Symbol("SellerProfileReadPort");
