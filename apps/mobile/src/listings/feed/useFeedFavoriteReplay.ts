import { useQueryClient } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";

import { setFeedFavorited } from "../../api/listings/setFeedFavorited";
import { useFavoriteListing } from "../../api/listings/useFavoriteListing";
import { queryKeys } from "../../api/queryKeys";
import { useReplayAuthActionOfKind, type AuthHref } from "../../auth/intentStore";

/**
 * Finishes a Favorite that a signed-out ♡ on a feed card left waiting, once
 * sign-in returns to this screen (`returnTo`, the href the card passed to
 * `requireSignIn`). It lives on the screen, not the card: after sign-in the
 * feed refetches for the viewer and reloads only its first page, so a card
 * from a later page is gone. Writing the ♥ into the cached feeds first shows it
 * on any card that is (or comes back) on screen. The viewer's feed may still be
 * loading when the Favorite is saved and could land without the ♥, so the feeds
 * are refetched once the save succeeds.
 */
export function useFeedFavoriteReplay(returnTo: AuthHref): void {
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const favorite = useFavoriteListing();

  useReplayAuthActionOfKind(
    "favorite",
    returnTo,
    (listingId) => {
      setFeedFavorited(queryClient, listingId, true);
      favorite.mutate(listingId, {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: queryKeys.listings.lists() }),
        onError: () => setFeedFavorited(queryClient, listingId, false),
      });
    },
    isFocused,
  );
}
