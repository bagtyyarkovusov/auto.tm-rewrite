import { useQuery } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

export function useMyContactPhones(_opts?: {
  userId: string | null;
  enabled?: boolean;
}) {
  return useQuery<{ items: ListingsSchemas.MyContactPhonesResponse["items"] }>({
    queryKey: ["my-contact-phones-stub"],
    queryFn: async () => ({ items: [] }),
  });
}
