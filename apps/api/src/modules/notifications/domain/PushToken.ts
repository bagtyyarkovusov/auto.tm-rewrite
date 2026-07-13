import {
  PushTokenDomainError,
  PUSH_TOKEN_ERROR_CODES,
  VALID_PLATFORMS,
  type PushPlatform,
} from "./types";

export class PushToken {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly token: string,
    readonly platform: PushPlatform,
    readonly deviceId: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly lastSeenAt: Date,
    readonly invalidatedAt: Date | null,
  ) {
    if (!token.trim()) {
      throw new PushTokenDomainError(
        PUSH_TOKEN_ERROR_CODES.TOKEN_REQUIRED,
        "Push token is required",
      );
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      throw new PushTokenDomainError(
        PUSH_TOKEN_ERROR_CODES.INVALID_PLATFORM,
        `Invalid push platform: ${platform}`,
      );
    }
  }

  static create(data: {
    id: string;
    userId: string;
    token: string;
    platform: PushPlatform;
    deviceId?: string | null | undefined;
    createdAt?: Date;
    updatedAt?: Date;
    lastSeenAt?: Date;
    invalidatedAt?: Date | null | undefined;
  }): PushToken {
    const now = new Date();
    return new PushToken(
      data.id,
      data.userId,
      data.token.trim(),
      data.platform,
      data.deviceId === undefined ? null : data.deviceId,
      data.createdAt ?? now,
      data.updatedAt ?? now,
      data.lastSeenAt ?? now,
      data.invalidatedAt === undefined ? null : data.invalidatedAt,
    );
  }

  touch(): PushToken {
    const now = new Date();
    return new PushToken(
      this.id,
      this.userId,
      this.token,
      this.platform,
      this.deviceId,
      this.createdAt,
      now,
      now,
      null,
    );
  }

  reassignTo(userId: string): PushToken {
    const now = new Date();
    return PushToken.create({
      id: this.id,
      userId,
      token: this.token,
      platform: this.platform,
      deviceId: this.deviceId,
      createdAt: this.createdAt,
      updatedAt: now,
      lastSeenAt: now,
      invalidatedAt: null,
    });
  }

  invalidate(): PushToken {
    const now = new Date();
    return new PushToken(
      this.id,
      this.userId,
      this.token,
      this.platform,
      this.deviceId,
      this.createdAt,
      now,
      this.lastSeenAt,
      now,
    );
  }

  isActive(): boolean {
    return this.invalidatedAt === null;
  }
}
