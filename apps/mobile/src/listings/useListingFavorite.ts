import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { queryKeys } from "../api/queryKeys";
import { setFeedFavorited } from "../api/listings/setFeedFavorited";
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

/** Writes a ♡ state into every cached copy a card or detail reads it from. */
function writeFavorited(queryClient: QueryClient, listingId: string, isFavorited: boolean) {
  setFeedFavorited(queryClient, listingId, isFavorited, { viewerOnly: true });
  queryClient.setQueryData<ListingsSchemas.ListingDetail>(
    queryKeys.listings.detail(listingId),
    (detail) => (detail ? { ...detail, isFavorited } : detail),
  );
}

/**
 * The ♡ on a Listing, shared by feed cards and Listing detail. Signed in, a
 * tap shows at once and is written into the cached feed pages and detail, so
 * every card of the Listing agrees. Taps never wait: the requests go out one
 * at a time until the server holds the last tapped state, and a failure puts
 * back what the server last confirmed. The ♡ shows the cached `isFavorited`
 * whenever nothing is in flight, so a refetch always corrects it. Signed out,
 * it opens sign-in with a pending Favorite that returns to `returnTo`. Taps
 * are ignored while the session is still loading.
 */
export function useListingFavorite({
  listingId,
  isFavorited,
  isAuthenticated,
  returnTo,
  replayAfterSignIn = false,
}: UseListingFavoriteOptions) {
  const queryClient = useQueryClient();
  const { mutateAsync: add } = useFavoriteListing();
  const { mutateAsync: remove } = useUnfavoriteListing();
  // The tapped state while requests are in flight; null shows the cache.
  const [shown, setShown] = useState<boolean | null>(null);
  const target = useRef<boolean | null>(null);
  const confirmed = useRef(isFavorited);
  const sending = useRef(false);

  useEffect(() => {
    if (!sending.current) confirmed.current = isFavorited;
  }, [isFavorited]);

  const sync = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      while (target.current !== null && target.current !== confirmed.current) {
        const want = target.current;
        try {
          await (want ? add(listingId) : remove(listingId));
          confirmed.current = want;
        } catch {
          writeFavorited(queryClient, listingId, confirmed.current);
          break;
        }
      }
    } finally {
      sending.current = false;
      target.current = null;
      setShown(null);
    }
  }, [add, listingId, queryClient, remove]);

  const favorited = shown ?? isFavorited;

  // Also the replay body: it must not re-check `isAuthenticated`, which is
  // refreshed asynchronously and is still false for a beat after sign-in,
  // while the API client already sends the new token.
  const setFavorited = (next: boolean) => {
    target.current = next;
    setShown(next);
    writeFavorited(queryClient, listingId, next);
    void sync();
  };

  useReplayAuthAction("favorite", replayAfterSignIn ? listingId : undefined, () => setFavorited(true));

  const toggle = () => {
    if (isAuthenticated === false) {
      useAuthIntentStore.getState().requireSignIn(router, {
        returnTo,
        action: { kind: "favorite", listingId },
      });
      return;
    }
    if (isAuthenticated !== true) return;
    setFavorited(!favorited);
  };

  return { favorited, toggle };
}
