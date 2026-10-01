import type { QueryClient } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

/** Placeholder: the red checkpoint's tests fail until the cache scan lands. */
export function findCachedListingSummary(
  _queryClient: QueryClient,
  _listingId: string,
): ListingsSchemas.ListingSummary | undefined {
  return undefined;
}
