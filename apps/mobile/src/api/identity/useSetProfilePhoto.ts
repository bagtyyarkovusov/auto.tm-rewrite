import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas, type IdentitySchemas } from "@auto-tm/contracts";

import { type ProfilePhotoSession } from "../../identity/profilePhotoSession";
import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** Writes the server's identity only while the initiating session still owns it. */
export function useSetProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: async ({ request, session }: { request: IdentitySchemas.SetProfilePhotoRequest; session: ProfilePhotoSession }) => {
      const credentials = await session.current();
      return apiClient.put("/me/photo", request, AuthSchemas.MeResponseSchema, { accessToken: credentials.accessToken });
    },
    onSuccess: async (me, { session }) => {
      await session.current();
      if (me.id !== session.userId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.me() });
      await session.current();
      queryClient.setQueryData(queryKeys.me(), me);
    },
  });
}
