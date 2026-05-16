import { useMutation } from "@tanstack/react-query";

import { AuthSchemas } from "@auto-tm/contracts";

import { loadAuthSession } from "../../auth/session";
import { apiClient } from "../client";

export function useRefreshSession() {
  return useMutation({
    mutationFn: async () => {
      const session = await loadAuthSession();
      if (!session) {
        throw new Error("No session to refresh");
      }

      return apiClient.post(
        "/auth/refresh",
        { refreshToken: session.refreshToken },
        AuthSchemas.RefreshResponseSchema,
        { auth: false },
      );
    },
  });
}
