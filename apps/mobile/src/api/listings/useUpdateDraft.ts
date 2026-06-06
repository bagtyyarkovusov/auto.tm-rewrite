import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      draftId,
      payload,
    }: {
      draftId: string;
      payload: ListingsSchemas.ListingDraftPayload;
    }) =>
      apiClient.patch(
        `/listings/drafts/${draftId}`,
        payload,
        ListingsSchemas.ListingDraftSchema,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDrafts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDraftsInfinite() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(variables.draftId),
      });
    },
  });
}
