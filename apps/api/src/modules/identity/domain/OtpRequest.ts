export interface OtpRequest {
  readonly id: string;
  readonly channel: SignInCodeChannel;
  readonly destination: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly verifiedAt: Date | null;
  readonly attempts: number;
  readonly userId: string | null;
  readonly ip: string;
  readonly createdAt: Date;
}

export type { SignInCodeChannel } from "./types";

import type { SignInCodeChannel } from "./types";
