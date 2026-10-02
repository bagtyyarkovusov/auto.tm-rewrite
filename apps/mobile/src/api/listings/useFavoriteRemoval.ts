import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { Enums, type ListingsSchemas } from "@auto-tm/contracts";

import { queryKeys } from "../queryKeys";

import { useUnfavoriteListing } from "./useUnfavoriteListing";

type Favorite = ListingsSchemas.FavoriteListingSummary;
type FavoritePages = InfiniteData<ListingsSchemas.MyFavoritesResponse>;

/** How long Undo is offered before the Favorite is deleted on the server. */
export const FAVORITE_REMOVAL_DELAY_MS = 3000;

/** Drops a deleted Favorite from both Hide sold lists and lowers their counts. */
function dropFromFavoriteLists(queryClient: QueryClient, removed: Favorite) {
  const inactive = removed.status !== Enums.ListingStatus.Active;
  queryClient.setQueriesData<FavoritePages>({ queryKey: queryKeys.favorites.lists() }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== removed.id),
        counts: {
          total: Math.max(0, page.counts.total - 1),
          inactive: Math.max(0, page.counts.inactive - (inactive ? 1 : 0)),
        },
      })),
    };
  });
}

interface UseFavoriteRemovalOptions {
  delayMs?: number;
  /** The server refused the delete; the card is already back. */
  onFailed?: (listing: Favorite) => void;
}

/**
 * Removes a Favorite with Undo. The card hides at once, and the delete is sent
 * only when the delay ends, another card is removed, `flush` runs (the screen
 * lost focus) or the screen unmounts. Undo before that sends nothing. Only the
 * latest removal can be undone. A failed delete shows the card again.
 */
export function useFavoriteRemoval({
  delayMs = FAVORITE_REMOVAL_DELAY_MS,
  onFailed,
}: UseFavoriteRemovalOptions = {}) {
  const queryClient = useQueryClient();
  const { mutateAsync } = useUnfavoriteListing();
  const [hidden, setHidden] = useState<ReadonlyMap<string, Favorite>>(() => new Map());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pending = useRef<{ listing: Favorite; timer: ReturnType<typeof setTimeout> } | null>(null);
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  const show = useCallback((listingId: string) => {
    setHidden((current) => {
      const next = new Map(current);
      next.delete(listingId);
      return next;
    });
  }, []);

  const flush = useCallback(() => {
    const current = pending.current;
    if (!current) return;
    clearTimeout(current.timer);
    pending.current = null;
    setPendingId(null);
    const { listing } = current;
    // `mutateAsync`, not `mutate` with callbacks: a later delete must not
    // swallow this one's outcome.
    mutateAsync(listing.id).then(
      () => {
        dropFromFavoriteLists(queryClient, listing);
        show(listing.id);
      },
      () => {
        show(listing.id);
        onFailedRef.current?.(listing);
      },
    );
  }, [mutateAsync, queryClient, show]);

  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);

  const remove = useCallback(
    (listing: Favorite) => {
      flush();
      setHidden((current) => new Map(current).set(listing.id, listing));
      setPendingId(listing.id);
      pending.current = { listing, timer: setTimeout(() => flushRef.current(), delayMs) };
    },
    [delayMs, flush],
  );

  /** Puts the latest removed card back. False when nothing can be undone any more. */
  const undo = useCallback(() => {
    const current = pending.current;
    if (!current) return false;
    clearTimeout(current.timer);
    pending.current = null;
    setPendingId(null);
    show(current.listing.id);
    return true;
  }, [show]);

  /** `hidden` holds every removed card not yet confirmed deleted, by Listing ID. */
  return { hidden, pendingId, remove, undo, flush };
}
