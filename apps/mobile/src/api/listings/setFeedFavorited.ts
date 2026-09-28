import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { queryKeys } from "../queryKeys";

type FeedPages = InfiniteData<ListingsSchemas.FeedResponse>;

/** Position of `viewerId` in `queryKeys.listings.list(filters, viewerId)`. */
const VIEWER_ID_INDEX = queryKeys.listings.lists().length + 1;

/**
 * Writes a ♡ state into cached feed pages that hold the Listing, so a card
 * that scrolls back into view, or the Home grid after a ♡ on Listing detail,
 * shows it without refetching the feed. Every caller passes `viewerOnly`:
 * logout and account deletion clear the whole cache, but a silent sign-out
 * (a rejected refresh) does not, and Home would then show a signed-in User's
 * ♥ from the anonymous feed. `useFeedFavoriteReplay` writes optimistically and
 * rolls back on error, so the cache is not server truth.
 */
export function setFeedFavorited(
  queryClient: QueryClient,
  listingId: string,
  isFavorited: boolean,
  { viewerOnly = false }: { viewerOnly?: boolean } = {},
): void {
  queryClient.setQueriesData<FeedPages>(
    {
      queryKey: queryKeys.listings.lists(),
      predicate: (query) => !viewerOnly || query.queryKey[VIEWER_ID_INDEX] != null,
    },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === listingId ? { ...item, isFavorited } : item,
          ),
        })),
      };
    },
  );
}
