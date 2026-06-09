export class Favorite {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly listingId: string,
    readonly createdAt: Date,
  ) {}

  static create(data: {
    id: string;
    userId: string;
    listingId: string;
    createdAt?: Date;
  }): Favorite {
    return new Favorite(
      data.id,
      data.userId,
      data.listingId,
      data.createdAt ?? new Date(),
    );
  }
}
