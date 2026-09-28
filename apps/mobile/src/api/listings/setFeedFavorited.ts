import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { queryKeys } from "../queryKeys";

type FeedPages = InfiniteData<ListingsSchemas.FeedResponse>;

/**
 * Writes a ♡ state into every cached feed page that holds the Listing, so a
 * card that scrolls back into view, or the Home grid after a ♡ on Listing
 * detail, shows it without refetching the feed. `useFavoriteListing` and
 * `useUnfavoriteListing` call it on success; `useFeedFavoriteReplay` also calls
 * it optimistically and rolls it back on error, so the cache is not server truth.
 */
export function setFeedFavorited(
  queryClient: QueryClient,
  listingId: string,
  isFavorited: boolean,
): void {
  queryClient.setQueriesData<FeedPages>(
    { queryKey: queryKeys.listings.lists() },
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
