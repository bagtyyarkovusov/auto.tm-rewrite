import { useMutation } from "@tanstack/react-query";
import { UploadsSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";

export function usePresignUpload() {
  return useMutation({
    mutationFn: (request: UploadsSchemas.PresignRequest) =>
      apiClient.post(
        "/uploads/presign",
        request,
        UploadsSchemas.PresignResponseSchema,
      ),
  });
}
