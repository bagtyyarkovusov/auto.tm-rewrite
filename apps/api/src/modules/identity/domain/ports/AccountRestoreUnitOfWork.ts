/** The writes that restoring a User makes. They exist only inside one unit of work. */
export interface AccountRestoreWrites {
  /** Republishes the seller's Listings that the account deletion archived. */
  republishListingsArchivedByDeletion(sellerId: string): Promise<void>;
  clearDeletionSchedule(userId: string): Promise<void>;
}

/**
 * Runs the restore writes in one transaction: they all commit, or, when the
 * work throws, none of them does.
 */
export interface AccountRestoreUnitOfWork {
  run<T>(work: (writes: AccountRestoreWrites) => Promise<T>): Promise<T>;
}

export const ACCOUNT_RESTORE_UNIT_OF_WORK = Symbol("AccountRestoreUnitOfWork");
