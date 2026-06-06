import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useDiscardDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) =>
      apiClient.delete(`/listings/drafts/${draftId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDrafts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.listings.myDraftsInfinite() });
    },
  });
}
