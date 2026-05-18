export type ListingEventPayload =
  | { event: "ListingCreated"; listingId: string; sellerId: string }
  | { event: "ListingUpdated"; listingId: string }
  | { event: "ListingSold"; listingId: string; sellerId: string }
  | { event: "ListingDeleted"; listingId: string; sellerId: string };

export interface ListingEventPublisher {
  emit(payload: ListingEventPayload): Promise<void>;
}

export const LISTING_EVENT_PUBLISHER = Symbol("ListingEventPublisher");
