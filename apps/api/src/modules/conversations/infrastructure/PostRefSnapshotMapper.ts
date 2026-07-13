import type {
  ListingsReadPort,
  ListingSummary,
} from "../../listings/domain/ports/ListingsReadPort";
import type {
  PostRefListingStatus,
  PostRefMessageMetadata,
} from "../domain/types";

export function buildPostRefSnapshot(
  listing: ListingSummary,
): PostRefMessageMetadata {
  const snapshot: PostRefMessageMetadata = {
    listingId: listing.id,
    brandId: listing.brandId,
    modelId: listing.modelId,
    displayPriceTmt: listing.displayPriceTmt,
    priceCurrency: listing.priceCurrency,
    status: listing.status as PostRefListingStatus,
  };

  if (listing.year !== undefined) {
    snapshot.year = listing.year;
  }

  if (listing.coverMediaKey) {
    snapshot.coverMediaKey = listing.coverMediaKey;
  }

  return snapshot;
}

export function isListingReferenceActive(
  listing: ListingSummary | null | undefined,
): boolean {
  return listing?.status === "active";
}

export function availabilityMapForListingSummaries(
  listings: ListingSummary[],
): Map<string, boolean> {
  return new Map(
    listings.map((listing) => [
      listing.id,
      isListingReferenceActive(listing),
    ]),
  );
}

export function withAvailabilityFallback(
  metadata: PostRefMessageMetadata,
  listings: ListingsReadPort,
): Promise<PostRefMessageMetadata & { available: boolean }>;
export function withAvailabilityFallback(
  metadata: PostRefMessageMetadata,
  availabilityMap: Map<string, boolean>,
): PostRefMessageMetadata & { available: boolean };
export function withAvailabilityFallback(
  metadata: PostRefMessageMetadata,
  source: ListingsReadPort | Map<string, boolean>,
):
  | Promise<PostRefMessageMetadata & { available: boolean }>
  | (PostRefMessageMetadata & { available: boolean }) {
  if (isAvailabilityMap(source)) {
    return {
      ...metadata,
      available: source.get(metadata.listingId) ?? false,
    };
  }

  return source
    .getListingSummaries([metadata.listingId])
    .then((summaries) =>
      withAvailabilityFallback(metadata, availabilityMapForListingSummaries(summaries)),
    );
}

function isAvailabilityMap(
  source: ListingsReadPort | Map<string, boolean>,
): source is Map<string, boolean> {
  return source instanceof Map;
}
