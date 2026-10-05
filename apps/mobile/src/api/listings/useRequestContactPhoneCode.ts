import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

/**
 * Asks for a contact-phone code. The server answers `confirmed` without
 * sending anything when the number is the account phone or still reusable.
 * That answer can name a number this device's list does not hold yet (it was
 * confirmed elsewhere), so the list is refetched.
 */
export function useRequestContactPhoneCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ListingsSchemas.ContactPhoneCodeRequest) =>
      apiClient.post(
        "/me/contact-phones/request",
        input,
        ListingsSchemas.ContactPhoneCodeRequestResponseSchema,
      ),
    onSuccess: async (result) => {
      if (result.status !== "confirmed") return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.listings.myContactPhonesAll(),
      });
    },
  });
}
