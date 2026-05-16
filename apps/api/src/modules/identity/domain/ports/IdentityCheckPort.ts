export interface IdentityCheckPort {
  isAdmin(userId: string): Promise<boolean>;
  isInDealership(userId: string, dealershipId: string): Promise<boolean>;
}
