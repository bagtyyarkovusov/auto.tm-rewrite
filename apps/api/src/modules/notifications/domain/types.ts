export type PushPlatform = "android" | "ios" | "web";

export const VALID_PLATFORMS: readonly PushPlatform[] = ["android", "ios", "web"];

export const PUSH_TOKEN_ERROR_CODES = {
  TOKEN_REQUIRED: "TOKEN_REQUIRED",
  PLATFORM_REQUIRED: "PLATFORM_REQUIRED",
  INVALID_PLATFORM: "INVALID_PLATFORM",
} as const;

export class PushTokenDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PushTokenDomainError";
  }
}
