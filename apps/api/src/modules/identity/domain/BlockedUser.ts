export class BlockedUser {
  private constructor(
    readonly id: string,
    readonly blockerId: string,
    readonly blockedId: string,
    readonly createdAt: Date,
  ) {
    if (blockerId === blockedId) {
      throw new Error("Self-blocking is not allowed");
    }
  }

  static create(data: {
    id: string;
    blockerId: string;
    blockedId: string;
    createdAt?: Date;
  }): BlockedUser {
    return new BlockedUser(
      data.id,
      data.blockerId,
      data.blockedId,
      data.createdAt ?? new Date(),
    );
  }
}
