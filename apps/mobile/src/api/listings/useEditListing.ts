import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useEditListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listingId,
      patch,
    }: {
      listingId: string;
      patch: ListingsSchemas.EditListingRequest;
    }) =>
      apiClient.patch(
        `/listings/${listingId}`,
        patch,
        ListingsSchemas.ListingDetailSchema,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(variables.listingId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myListings() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.all() });
    },
  });
}
