import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { type ProfilePhotoSession } from "../../identity/profilePhotoSession";
import { ApiError, apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** Removal answers the unchanged Assigned Avatar with no Profile Photo. */
export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: async (session: ProfilePhotoSession) => {
      await session.current();
      return apiClient.delete("/me/photo", AuthSchemas.MeResponseSchema, { assertSession: () => session.current() });
    },
    onSuccess: async (me, session) => {
      await session.current();
      if (me.id !== session.userId) throw new ApiError("CONTRACT_VIOLATION", 502, "Profile Photo response belongs to another User");
      await queryClient.cancelQueries({ queryKey: queryKeys.me() });
      await session.current();
      queryClient.setQueryData(queryKeys.me(), me);
    },
  });
}
