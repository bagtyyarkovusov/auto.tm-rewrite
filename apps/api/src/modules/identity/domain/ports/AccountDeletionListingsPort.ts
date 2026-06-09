export interface AccountDeletionListingsPort {
  archiveActiveListingsBySeller(sellerId: string): Promise<void>;
  republishArchivedByDeletionListingsBySeller(sellerId: string): Promise<void>;
}

export const ACCOUNT_DELETION_LISTINGS_PORT = Symbol("AccountDeletionListingsPort");
