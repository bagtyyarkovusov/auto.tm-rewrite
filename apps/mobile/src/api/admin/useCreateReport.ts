import { useMutation } from "@tanstack/react-query";
import { AdminSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function useCreateReport() {
  return useMutation({
    mutationFn: (input: {
      targetType: "listing" | "user";
      targetId: string;
      reason: AdminSchemas.CreateReportRequest["reason"];
      details?: string;
    }) =>
      apiClient.post(
        `/${input.targetType}s/${input.targetId}/report`,
        {
          reason: input.reason,
          ...(input.details ? { details: input.details } : {}),
        },
        AdminSchemas.CreateReportResponseSchema,
      ),
  });
}
