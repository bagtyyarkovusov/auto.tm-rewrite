import { useMutation } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

export function useRequestContactPhoneCode() {
  return useMutation({
    mutationFn: async (
      _input: ListingsSchemas.ContactPhoneCodeRequest,
    ): Promise<ListingsSchemas.ContactPhoneCodeRequestResponse> => {
      throw new Error("not implemented");
    },
  });
}
