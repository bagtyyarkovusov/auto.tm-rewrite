import type { OtpRequest, SignInCodeChannel } from "../OtpRequest";

export interface OtpRequestRepository {
  create(input: {
    channel: SignInCodeChannel;
    destination: string;
    codeHash: string;
    expiresAt: Date;
    userId: string | null;
    ip: string;
  }): Promise<OtpRequest>;

  findById(id: string): Promise<OtpRequest | null>;

  findLatestByDestination(
    channel: SignInCodeChannel,
    destination: string,
  ): Promise<OtpRequest | null>;

  findLatestByDestinationAndUser(
    channel: SignInCodeChannel,
    destination: string,
    userId: string,
  ): Promise<OtpRequest | null>;

  countByDestinationSince(
    channel: SignInCodeChannel,
    destination: string,
    since: Date,
  ): Promise<number>;

  countByIpSince(ip: string, since: Date): Promise<number>;

  markVerified(id: string, userId: string): Promise<OtpRequest>;

  /** Atomically marks an unused request as used; false when another caller already used it. */
  consumeIfUnused(id: string): Promise<boolean>;

  incrementAttempts(id: string): Promise<OtpRequest>;
}
