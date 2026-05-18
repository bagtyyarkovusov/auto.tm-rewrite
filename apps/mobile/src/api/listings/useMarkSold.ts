import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const MarkSoldResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  soldAt: z.string().datetime().nullable().optional(),
});

export function useMarkSold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) =>
      apiClient.post(
        `/listings/${listingId}/sold`,
        {},
        MarkSoldResponseSchema,
      ),
    onSuccess: (_data, listingId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(listingId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myListings() });
    },
  });
}
