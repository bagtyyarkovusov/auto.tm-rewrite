import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) =>
      apiClient.delete(`/listings/${listingId}`),
    onSuccess: (_data, listingId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(listingId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myListings() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.all() });
    },
  });
}
