import { useQuery } from "@tanstack/react-query";
import { ListingsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useMyDrafts(cursor?: string, limit: number = 20) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  return useQuery({
    queryKey: [...queryKeys.listings.myDrafts(), { cursor, limit }],
    queryFn: () =>
      apiClient.get(
        `/me/drafts?${params.toString()}`,
        ListingsSchemas.MyDraftsResponseSchema,
      ),
  });
}
