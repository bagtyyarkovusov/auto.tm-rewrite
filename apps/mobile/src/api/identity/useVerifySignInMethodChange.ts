import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { updateStoredSessionUser } from "../../auth/session";
import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useVerifySignInMethodChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AuthSchemas.SignInMethodChangeVerifyRequest) =>
      apiClient.post(
        "/me/sign-in-methods/verify",
        input,
        AuthSchemas.SignInMethodChangeResponseSchema,
      ),
    // The API answers with the updated /me, so Profile and Cabinet show the
    // new Sign-in Method without a refetch. The stored session keeps its
    // tokens; only its User copy (read by useAuth) is brought up to date.
    onSuccess: async (me) => {
      queryClient.setQueryData(queryKeys.me(), me);
      await updateStoredSessionUser({ phone: me.phone, email: me.email });
    },
  });
}
