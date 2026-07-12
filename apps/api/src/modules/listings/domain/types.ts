export type Currency = "TMT" | "USD" | "AED";

export interface SellerTrust {
  phoneVerified: boolean;
}

export const VERIFIED_PHONE_TRUST: SellerTrust = { phoneVerified: true };

export interface ConditionDisclosure {
  accidentReported: boolean;
  mileageAccurate: boolean;
  ownerCount?: number | undefined;
  serviceHistoryAvailable: boolean;
  knownIssuesText?: string | undefined;
}

export type MediaKind = "image" | "video";

export type FeedCursor = {
  timestamp: string;
  id: string;
};

export interface ListingFilterCriteria {
  // Forward-defined for S5 / #92 — S4 always passes empty filters
  brandId?: string;
  modelId?: string;
  modelIds?: string[];
  cityId?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  condition?: "new" | "used";
}

export const LOCKED_FIELDS = [
  "brandId",
  "modelId",
  "generationId",
  "year",
  "vin",
] as const;
export type LockedField = (typeof LOCKED_FIELDS)[number];

export const LISTING_ERROR_CODES = {
  CONTACT_METHOD_REQUIRED: "CONTACT_METHOD_REQUIRED",
  LISTING_FIELD_LOCKED: "LISTING_FIELD_LOCKED",
  EXCHANGE_RATE_MISSING: "EXCHANGE_RATE_MISSING",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  INVALID_PRICE: "INVALID_PRICE",
  INVALID_FILTER_RANGE: "INVALID_FILTER_RANGE",
  INVALID_EXCHANGE_RATE: "INVALID_EXCHANGE_RATE",
  MEDIA_LIMIT_EXCEEDED: "MEDIA_LIMIT_EXCEEDED",
} as const;
export type ListingErrorCode =
  (typeof LISTING_ERROR_CODES)[keyof typeof LISTING_ERROR_CODES];

export class DomainError extends Error {
  constructor(
    readonly code: ListingErrorCode,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = "DomainError";
  }
}
