import { useMutation } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () =>
      apiClient.delete("/me", AuthSchemas.DeleteMeResponseSchema),
  });
}
