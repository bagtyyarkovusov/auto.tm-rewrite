/** A number a seller confirmed by SMS code for their Listings (ADR-0056, ADR-0081). */
export class VerifiedContactPhone {
  private constructor(
    readonly sellerId: string,
    readonly phone: string,
    readonly confirmedAt: Date,
  ) {}

  static create(props: {
    sellerId: string;
    phone: string;
    confirmedAt: Date;
  }): VerifiedContactPhone {
    return new VerifiedContactPhone(props.sellerId, props.phone, props.confirmedAt);
  }

  get reusableUntil(): Date {
    throw new Error("not implemented");
  }

  isReusableAt(_now: Date): boolean {
    throw new Error("not implemented");
  }
}
