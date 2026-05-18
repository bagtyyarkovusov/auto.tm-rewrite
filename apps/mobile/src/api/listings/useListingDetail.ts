import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useListingDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.listings.detail(id),
    queryFn: () =>
      apiClient.get(
        `/listings/${id}`,
        ListingsSchemas.ListingDetailSchema,
        { auth: false },
      ),
    enabled: !!id,
  });
}
