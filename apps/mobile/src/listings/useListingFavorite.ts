import { router } from "expo-router";
import { useEffect, useState } from "react";

import { useFavoriteListing } from "../api/listings/useFavoriteListing";
import { useUnfavoriteListing } from "../api/listings/useUnfavoriteListing";
import {
  type AuthHref,
  useAuthIntentStore,
  useReplayAuthAction,
} from "../auth/intentStore";

interface UseListingFavoriteOptions {
  listingId: string;
  isFavorited: boolean;
  /** `null` while the session is still loading; taps are ignored then. */
  isAuthenticated: boolean | null;
  /** The screen sign-in returns to before finishing the ♡. */
  returnTo: AuthHref;
  /**
   * Finish a pending Favorite for this Listing here after sign-in. Listing
   * detail sets it; feed cards leave it to `useFeedFavoriteReplay`, because a
   * card may not be mounted when sign-in returns.
   */
  replayAfterSignIn?: boolean;
}

/**
 * The ♡ on a Listing, shared by feed cards and Listing detail. Signed in, it
 * toggles optimistically and rolls back on failure. Signed out, it opens
 * sign-in with a pending Favorite that returns to `returnTo`. Taps are
 * ignored while the session is still loading.
 */
export function useListingFavorite({
  listingId,
  isFavorited,
  isAuthenticated,
  returnTo,
  replayAfterSignIn = false,
}: UseListingFavoriteOptions) {
  const favorite = useFavoriteListing();
  const unfavorite = useUnfavoriteListing();
  const [favorited, setFavorited] = useState(isFavorited);

  // A refetched feed page is the source of truth once it arrives.
  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  // Also the replay body: it must not re-check `isAuthenticated`, which is
  // refreshed asynchronously and is still false for a beat after sign-in,
  // while the API client already sends the new token.
  const addFavorite = () => {
    setFavorited(true);
    favorite.mutate(listingId, {
      onError: () => setFavorited(false),
    });
  };

  useReplayAuthAction("favorite", replayAfterSignIn ? listingId : undefined, addFavorite);

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
