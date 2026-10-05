export interface AccountDeletionListingsPort {
  archiveActiveListingsBySeller(sellerId: string): Promise<void>;
}

export const ACCOUNT_DELETION_LISTINGS_PORT = Symbol("AccountDeletionListingsPort");
