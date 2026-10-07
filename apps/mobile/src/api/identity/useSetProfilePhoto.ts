import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas, type IdentitySchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** Writes the server's complete identity into the shared Profile/Cabinet query. */
export function useSetProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: (request: IdentitySchemas.SetProfilePhotoRequest) =>
      apiClient.put("/me/photo", request, AuthSchemas.MeResponseSchema),
    onSuccess: async (me) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me() });
      queryClient.setQueryData(queryKeys.me(), me);
    },
  });
}
