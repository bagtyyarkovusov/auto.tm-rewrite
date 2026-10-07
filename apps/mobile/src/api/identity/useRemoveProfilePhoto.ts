import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** Removal answers the unchanged Assigned Avatar with no Profile Photo. */
export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: () => apiClient.delete("/me/photo", AuthSchemas.MeResponseSchema),
    onSuccess: async (me) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me() });
      queryClient.setQueryData(queryKeys.me(), me);
    },
  });
}
