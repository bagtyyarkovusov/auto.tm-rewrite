import { useMutation } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

/**
 * Asks for a contact-phone code. The server answers `confirmed` without
 * sending anything when the number is the account phone or still reusable.
 */
export function useRequestContactPhoneCode() {
  return useMutation({
    mutationFn: (input: ListingsSchemas.ContactPhoneCodeRequest) =>
      apiClient.post(
        "/me/contact-phones/request",
        input,
        ListingsSchemas.ContactPhoneCodeRequestResponseSchema,
      ),
  });
}
