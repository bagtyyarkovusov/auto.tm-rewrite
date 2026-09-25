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

  /** Consumes the code; binds it to `userId` when given, otherwise keeps the stored binding. */
  markVerified(id: string, userId?: string): Promise<OtpRequest>;

  incrementAttempts(id: string): Promise<OtpRequest>;
}
