import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/** Confirms a contact phone with its code; a confirmation restarts the 7 days. */
export function useConfirmContactPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ListingsSchemas.ContactPhoneVerifyRequest) =>
      apiClient.post(
        "/me/contact-phones/verify",
        input,
        ListingsSchemas.ContactPhoneVerifyResponseSchema,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.listings.myContactPhonesAll(),
      });
    },
  });
}
