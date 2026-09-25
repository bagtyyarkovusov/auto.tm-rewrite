import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

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
    // new Sign-in Method without a refetch. Sessions are untouched.
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.me(), me);
    },
  });
}
