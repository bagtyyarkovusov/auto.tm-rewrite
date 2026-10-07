import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { type ProfilePhotoSession } from "../../identity/profilePhotoSession";
import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** Removal answers the unchanged Assigned Avatar with no Profile Photo. */
export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: async (session: ProfilePhotoSession) => {
      const credentials = await session.current();
      return apiClient.delete("/me/photo", AuthSchemas.MeResponseSchema, { accessToken: credentials.accessToken });
    },
    onSuccess: async (me, session) => {
      await session.current();
      if (me.id !== session.userId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.me() });
      await session.current();
      queryClient.setQueryData(queryKeys.me(), me);
    },
  });
}
