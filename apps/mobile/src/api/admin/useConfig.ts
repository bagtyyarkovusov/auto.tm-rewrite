import { useQuery } from "@tanstack/react-query";
import { AdminSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => apiClient.get("/config", AdminSchemas.ConfigResponseSchema),
    staleTime: 60_000,
  });
}
