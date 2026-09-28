import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

import { setFeedFavorited } from "./setFeedFavorited";

export function useFavoriteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) =>
      apiClient.post(
        `/listings/${listingId}/favorite`,
        {},
        ListingsSchemas.AddFavoriteResponseSchema,
      ),

    onSuccess: (_data, listingId) => {
      setFeedFavorited(queryClient, listingId, true);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(listingId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.favorites.all(),
      });
    },
  });
}
