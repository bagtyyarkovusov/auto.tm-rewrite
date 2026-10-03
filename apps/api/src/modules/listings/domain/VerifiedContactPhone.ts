/** How long a confirmation lets the seller reuse the number: 7 × 24 hours. */
const REUSE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A number a seller confirmed by SMS code for their Listings (ADR-0056,
 * ADR-0081). It is not a Sign-in Method. This object is the only place that
 * holds the 7-day rule; times are UTC instants.
 */
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
    return new Date(this.confirmedAt.getTime() + REUSE_WINDOW_MS);
  }

  isReusableAt(now: Date): boolean {
    return now.getTime() < this.reusableUntil.getTime();
  }
}
