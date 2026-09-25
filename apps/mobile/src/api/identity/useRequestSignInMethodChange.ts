import { useMutation } from "@tanstack/react-query";
import { AuthSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function useRequestSignInMethodChange() {
  return useMutation({
    mutationFn: (input: AuthSchemas.SignInMethodChangeRequest) =>
      apiClient.post(
        "/me/sign-in-methods/request",
        input,
        AuthSchemas.OtpRequestResponseSchema,
      ),
  });
}
