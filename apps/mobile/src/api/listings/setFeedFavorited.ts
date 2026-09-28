import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { queryKeys } from "../queryKeys";

type FeedPages = InfiniteData<ListingsSchemas.FeedResponse>;

/**
 * Writes a confirmed ♡ change into every cached feed page that holds the
 * Listing, so a card that scrolls back into view, or the Home grid after a
 * ♡ on Listing detail, shows the saved state without refetching the feed.
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
