export interface TotpVerifierPort {
  generateSecret(): string;
  generateAuthUri(params: { secret: string; userId: string; issuer: string }): string;
  verify(secret: string, code: string): boolean;
}
