import type { IdentityCheckPort } from "../../domain/ports/IdentityCheckPort";

/** `IdentityCheckPort` with suspension held in memory; other checks answer no. */
export class InMemoryIdentityCheck implements IdentityCheckPort {
  private readonly suspended = new Set<string>();

  suspend(userId: string): void {
    this.suspended.add(userId);
  }

  unsuspend(userId: string): void {
    this.suspended.delete(userId);
  }

  async isAdmin(_userId: string): Promise<boolean> {
    return false;
  }

  async isInDealership(_userId: string, _dealershipId: string): Promise<boolean> {
    return false;
  }

  async isSuspended(userId: string): Promise<boolean> {
    return this.suspended.has(userId);
  }

  async isDeletionScheduled(_userId: string): Promise<boolean> {
    return false;
  }

  async holdsSignInPhone(_userId: string, _phone: string): Promise<boolean> {
    return false;
  }
}
