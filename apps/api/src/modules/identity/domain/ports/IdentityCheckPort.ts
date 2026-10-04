export interface IdentityCheckPort {
  isAdmin(userId: string): Promise<boolean>;
  isInDealership(userId: string, dealershipId: string): Promise<boolean>;
  isSuspended(userId: string): Promise<boolean>;
  /** True while the User's account deletion is scheduled and not restored. */
  isDeletionScheduled(userId: string): Promise<boolean>;
  /**
   * True when `phone` is the User's own sign-in phone. Answers yes or no and
   * never returns the value (ADR-0081).
   */
  holdsSignInPhone(userId: string, phone: string): Promise<boolean>;
}
