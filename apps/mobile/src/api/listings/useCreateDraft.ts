import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: ListingsSchemas.ListingDraftPayload) =>
      apiClient.post(
        "/listings/drafts",
        payload ? { initialPayload: payload } : {},
        ListingsSchemas.ListingDraftSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDrafts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDraftsInfinite() });
    },
  });
}
