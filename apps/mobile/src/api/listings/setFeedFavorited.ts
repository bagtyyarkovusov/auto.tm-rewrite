import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { queryKeys } from "../queryKeys";

type FeedPages = InfiniteData<ListingsSchemas.FeedResponse>;

/** Position of `viewerId` in `queryKeys.listings.list(filters, viewerId)`. */
const VIEWER_ID_INDEX = queryKeys.listings.lists().length + 1;

/**
 * Writes a ♡ state into cached feed pages that hold the Listing, so a card
 * that scrolls back into view, or the Home grid after a ♡ on Listing detail,
 * shows it without refetching the feed. `useFavoriteListing` and
 * `useUnfavoriteListing` call it on success with `viewerOnly`, so a signed-in
 * User's ♡ never lands in an anonymous feed that is shown after sign-out.
 * `useFeedFavoriteReplay` calls it optimistically for every feed and rolls it
 * back on error, so the cache is not server truth.
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
