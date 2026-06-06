import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

const PublishDraftResponseSchema = z.object({
  id: z.string().uuid(),
  sellerId: z.string().uuid(),
  status: z.string(),
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  priceAmount: z.number(),
  priceCurrency: z.string(),
  publishedAt: z.string().datetime(),
});

export function usePublishDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) =>
      apiClient.post(
        `/listings/drafts/${draftId}/publish`,
        {},
        PublishDraftResponseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myListings() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myListingsInfinite() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDrafts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDraftsInfinite() });
    },
  });
}
