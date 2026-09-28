import { router } from "expo-router";
import { useEffect, useState } from "react";

import { useFavoriteListing } from "../../api/listings/useFavoriteListing";
import { useUnfavoriteListing } from "../../api/listings/useUnfavoriteListing";
import { type AuthHref, useAuthIntentStore } from "../../auth/intentStore";

interface UseCardFavoriteOptions {
  listingId: string;
  isFavorited: boolean;
  /** `null` while the session is still loading; taps are ignored then. */
  isAuthenticated: boolean | null;
  /** The screen sign-in returns to before finishing the ♡. */
  returnTo: AuthHref;
}

/**
 * ♡ on a feed card. Signed in, it toggles optimistically and rolls back on
 * failure. Signed out, it opens sign-in with a pending Favorite; the list
 * screen finishes it through `useFeedFavoriteReplay`, because this card may
 * not be mounted when sign-in returns.
 */
export function useCardFavorite({
  listingId,
  isFavorited,
  isAuthenticated,
  returnTo,
}: UseCardFavoriteOptions) {
  const favorite = useFavoriteListing();
  const unfavorite = useUnfavoriteListing();
  const [favorited, setFavorited] = useState(isFavorited);

  // A refetched feed page is the source of truth once it arrives.
  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  const addFavorite = () => {
    setFavorited(true);
    favorite.mutate(listingId, {
      onError: () => setFavorited(false),
    });
  };

  const toggle = () => {
    if (isAuthenticated === false) {
      useAuthIntentStore.getState().requireSignIn(router, {
        returnTo,
        action: { kind: "favorite", listingId },
      });
      return;
    }
    if (isAuthenticated !== true) return;

    if (!favorited) {
      addFavorite();
      return;
    }
    setFavorited(false);
    unfavorite.mutate(listingId, {
      onError: () => setFavorited(true),
    });
  };

  return {
    favorited,
    pending: favorite.isPending || unfavorite.isPending,
    toggle,
  };
}
