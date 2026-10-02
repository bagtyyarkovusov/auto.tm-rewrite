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
  const toast = useToast();
  const hideSold = useHideSoldStore((state) => state.hideSold);
  const setHideSold = useCallback((value: boolean) => useHideSoldStore.setState({ hideSold: value }), []);
  const query = useMyFavorites({ activeOnly: hideSold });
  const toastId = useRef<string | null>(null);

  const closeToast = useCallback(() => {
    if (toastId.current) toast.dismiss(toastId.current);
    toastId.current = null;
  }, [toast]);

  const removal = useFavoriteRemoval({
    onFailed: () => {
      toast.show({ title: t("favoritesRemoveFailed"), variant: "destructive", placement: "aboveTabBar" });
    },
  });

  const remove = useCallback(
    (listing: Favorite) => {
      closeToast();
      removal.remove(listing);
      toastId.current = toast.show({
        title: t("favoritesRemoved"),
        placement: "aboveTabBar",
        duration: FAVORITE_REMOVAL_DELAY_MS,
        action: {
          label: t("undo"),
          onPress: () => {
            toastId.current = null;
            removal.undo();
          },
        },
      });
    },
    [closeToast, removal, t, toast],
  );

  /** Sends a removal still waiting for Undo; the screen calls it when it loses focus. */
  const flush = useCallback(() => {
    closeToast();
    removal.flush();
  }, [closeToast, removal]);

  const loaded = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const items = useMemo(() => loaded.filter((item) => !removal.hidden.has(item.id)), [loaded, removal.hidden]);

  // The server still counts a removal waiting for Undo or for its delete.
  const counts = useMemo(() => {
    const server = query.data?.pages[0]?.counts ?? { total: 0, inactive: 0 };
    const hidden = [...removal.hidden.values()];
    return {
      total: Math.max(0, server.total - hidden.length),
      inactive: Math.max(0, server.inactive - hidden.filter((item) => item.status !== Enums.ListingStatus.Active).length),
    };
  }, [query.data, removal.hidden]);

  const state: FavoritesViewState = query.isPending
    ? "loading"
    : query.isError && !query.data
      ? "error"
      : counts.total === 0
        ? "empty"
        : items.length === 0 && hideSold
          ? "noActive"
          : "list";

  return { state, hideSold, setHideSold, items, counts, remove, flush, query };
}
