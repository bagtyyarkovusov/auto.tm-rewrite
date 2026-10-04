import { useMutation } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

export function useConfirmContactPhone() {
  return useMutation({
    mutationFn: async (
      _input: ListingsSchemas.ContactPhoneVerifyRequest,
    ): Promise<ListingsSchemas.ContactPhoneVerifyResponse> => {
      throw new Error("not implemented");
    },
  });
}
