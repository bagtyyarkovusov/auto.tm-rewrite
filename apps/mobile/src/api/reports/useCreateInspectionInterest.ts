import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReportsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useCreateInspectionInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      listingId: string;
      willingnessToPayTmt?: number;
    }) =>
      apiClient.post(
        `/listings/${input.listingId}/inspection-interest`,
        input.willingnessToPayTmt !== undefined
          ? { willingnessToPayTmt: input.willingnessToPayTmt }
          : {},
        ReportsSchemas.CreateInspectionInterestResponseSchema,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reports.inspectionInterest(variables.listingId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listings.detail(variables.listingId),
      });
    },
  });
}
