import { useQueryClient } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";

import { setFeedFavorited } from "../../api/listings/setFeedFavorited";
import { useFavoriteListing } from "../../api/listings/useFavoriteListing";
import { useReplayAuthActionOfKind } from "../../auth/intentStore";

/**
 * Finishes a Favorite that a signed-out ♡ on a feed card left waiting, once
 * sign-in returns to this screen. It lives on the screen, not the card: after
 * sign-in the feed refetches for the viewer and reloads only its first page,
 * so a card from a later page is gone. Writing the ♥ into the cached feeds
 * first shows it on any card that is (or comes back) on screen.
 */
export function useFeedFavoriteReplay(): void {
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const favorite = useFavoriteListing();

  useReplayAuthActionOfKind(
    "favorite",
    (listingId) => {
      setFeedFavorited(queryClient, listingId, true);
      favorite.mutate(listingId, {
        onError: () => setFeedFavorited(queryClient, listingId, false),
      });
    },
    isFocused,
  );
}
