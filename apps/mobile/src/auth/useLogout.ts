import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { apiClient } from "../api/client";

import { loadAuthSession, clearAuthSession } from "./session";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = await loadAuthSession();
      if (session) {
        // Best-effort server-side logout; ignore failures (token may already be revoked)
        try {
          await apiClient.post(
            "/auth/logout",
            { refreshToken: session.refreshToken },
            undefined,
            { auth: false },
          );
        } catch {
          // no-op
        }
      }
      await clearAuthSession();
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/(tabs)/index");
    },
  });
}
