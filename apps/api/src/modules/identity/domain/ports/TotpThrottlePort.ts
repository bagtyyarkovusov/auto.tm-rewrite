export interface TotpThrottlePort {
  recordFailure(userId: string, sessionId: string): Promise<number>;
  reset(userId: string, sessionId: string): Promise<void>;
}
