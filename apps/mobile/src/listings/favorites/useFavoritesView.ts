import { useCallback, useMemo, useRef } from "react";
import { Enums, type ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";
import { create } from "zustand";

import { useFavoriteRemoval, FAVORITE_REMOVAL_DELAY_MS } from "../../api/listings/useFavoriteRemoval";
import { useMyFavorites } from "../../api/listings/useMyFavorites";

import { useToast } from "@/components/ui/toast";

type Favorite = ListingsSchemas.FavoriteListingSummary;

/**
 * Hide sold, on when the app starts. It lives in memory only, so it keeps its
 * value while the app runs and is never stored on the device.
 */
export const useHideSoldStore = create<{ hideSold: boolean }>(() => ({ hideSold: true }));

export type FavoritesViewState = "loading" | "error" | "empty" | "noActive" | "list";

/**
 * What the Favorites tab shows: the Hide sold position, the list for it, the
 * counts, and removals waiting for Undo. A removed card leaves `items` and the
 * counts at once; the server delete waits for `useFavoriteRemoval`.
 */
export function useFavoritesView() {
  const { t } = useTranslation();
  const { show: showToast, dismiss: dismissToast } = useToast();
  const hideSold = useHideSoldStore((state) => state.hideSold);
  const setHideSold = useCallback((value: boolean) => useHideSoldStore.setState({ hideSold: value }), []);
  const query = useMyFavorites({ activeOnly: hideSold });
  const toastId = useRef<string | null>(null);

  const closeToast = useCallback(() => {
    if (toastId.current) dismissToast(toastId.current);
    toastId.current = null;
  }, [dismissToast]);

  const { hidden, remove: hide, undo, flush: send } = useFavoriteRemoval({
    // The delete timer is the one clock: the Undo toast closes when the delete is sent.
    onSent: closeToast,
    onFailed: () => {
      showToast({ title: t("favoritesRemoveFailed"), variant: "destructive", placement: "aboveTabBar" });
    },
  });

  const remove = useCallback(
    (listing: Favorite) => {
      closeToast();
      hide(listing);
      toastId.current = showToast({
        title: t("favoritesRemoved"),
        placement: "aboveTabBar",
        // Longer than the delay only as a fallback; `onSent` closes it first.
        duration: FAVORITE_REMOVAL_DELAY_MS + 1000,
        action: {
          label: t("undo"),
          onPress: () => {
            toastId.current = null;
            undo();
          },
        },
      });
    },
    [closeToast, hide, showToast, t, undo],
  );

  /** Sends a removal still waiting for Undo; the screen calls it when it loses focus. */
  const flush = useCallback(() => {
    closeToast();
    send();
  }, [closeToast, send]);

  const loaded = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const items = useMemo(() => loaded.filter((item) => !hidden.has(item.id)), [loaded, hidden]);

  // Counts are over every visible Favorite, so either position's last answer
  // stands in while the other one loads.
  const lastServerCounts = useRef<ListingsSchemas.MyFavoritesResponse["counts"] | null>(null);
  const serverCounts = query.data?.pages[0]?.counts ?? lastServerCounts.current;
  if (query.data?.pages[0]) lastServerCounts.current = query.data.pages[0].counts;

  // The server still counts a removal waiting for Undo or for its delete.
  const counts = useMemo(() => {
    const server = serverCounts ?? { total: 0, inactive: 0 };
    const pending = [...hidden.values()];
    return {
      total: Math.max(0, server.total - pending.length),
      inactive: Math.max(0, server.inactive - pending.filter((item) => item.status !== Enums.ListingStatus.Active).length),
    };
  }, [serverCounts, hidden]);

  const state: FavoritesViewState = query.isPending
    ? "loading"
    : query.isError && !query.data
      ? "error"
      : counts.total === 0
        ? "empty"
        : items.length === 0 && hideSold
          ? "noActive"
          : "list";

  /**
   * The switch shows once the User has Favorites, and stays while the other
   * position loads or fails, so the User can always switch back.
   */
  const showSwitch = serverCounts != null && counts.total > 0;

  return { state, hideSold, setHideSold, showSwitch, items, counts, remove, flush, query };
}
