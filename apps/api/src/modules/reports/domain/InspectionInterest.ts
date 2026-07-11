import { DomainError, INSPECTION_INTEREST_ERROR_CODES } from "./types";

export type InspectionInterestSide = "buyer" | "seller";

export interface InspectionInterestProps {
  id: string;
  listingId: string;
  requesterUserId: string;
  side: InspectionInterestSide;
  willingnessToPayTmt: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InspectionInterest {
  readonly id: string;
  readonly listingId: string;
  readonly requesterUserId: string;
  readonly side: InspectionInterestSide;
  readonly willingnessToPayTmt: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: InspectionInterestProps) {
    this.id = props.id;
    this.listingId = props.listingId;
    this.requesterUserId = props.requesterUserId;
    this.side = props.side;
    this.willingnessToPayTmt = props.willingnessToPayTmt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: {
    id: string;
    listingId: string;
    requesterUserId: string;
    side: InspectionInterestSide;
    willingnessToPayTmt?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): InspectionInterest {
    const willingnessToPayTmt =
      props.willingnessToPayTmt === undefined ? null : props.willingnessToPayTmt;

    if (willingnessToPayTmt !== null) {
      if (
        !Number.isInteger(willingnessToPayTmt) ||
        willingnessToPayTmt < 0 ||
        willingnessToPayTmt > 10000
      ) {
        throw new DomainError(
          INSPECTION_INTEREST_ERROR_CODES.INVALID_WILLINGNESS_TO_PAY,
          "willingnessToPayTmt must be an integer between 0 and 10000",
        );
      }
    }

    const now = new Date();
    return new InspectionInterest({
      id: props.id,
      listingId: props.listingId,
      requesterUserId: props.requesterUserId,
      side: props.side,
      willingnessToPayTmt,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static reconstruct(props: InspectionInterestProps): InspectionInterest {
    return new InspectionInterest(props);
  }

  withWillingnessToPay(value: number | null): InspectionInterest {
    if (value !== null) {
      if (!Number.isInteger(value) || value < 0 || value > 10000) {
        throw new DomainError(
          INSPECTION_INTEREST_ERROR_CODES.INVALID_WILLINGNESS_TO_PAY,
          "willingnessToPayTmt must be an integer between 0 and 10000",
        );
      }
    }

    return new InspectionInterest({
      id: this.id,
      listingId: this.listingId,
      requesterUserId: this.requesterUserId,
      side: this.side,
      willingnessToPayTmt: value,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }
}
