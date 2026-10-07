export interface TesterUser {
  id: string; phone: string | null; email: string | null; role: string;
  phoneVerifiedAt: Date | null; emailVerifiedAt: Date | null; deletionScheduledAt: Date | null;
}
export interface TesterTransaction {
  findUsers(accounts: { id: string; phone: string; email: string }[]): Promise<TesterUser[]>;
  createUser(account: { id: string; phone: string; email: string }, now: Date): Promise<void>;
  scheduleDeletion(ids: string[], now: Date): Promise<number>;
  deleteSessions(ids: string[]): Promise<number>;
  archiveListings(ids: string[]): Promise<number>;
}
export interface TesterAccountStore { transaction<T>(run: (tx: TesterTransaction) => Promise<T>): Promise<T>; }
export interface TesterOptions { mode: "seed" | "remove"; testerAccountsJson: string; reviewerAccountsJson: string; now: Date; }
export async function runTesterAccounts(_store: TesterAccountStore, _input: TesterOptions): Promise<{ created: number; scheduled: number; sessionsDeleted: number; listingsArchived: number }> {
  return { created: 0, scheduled: 0, sessionsDeleted: 0, listingsArchived: 0 };
}
