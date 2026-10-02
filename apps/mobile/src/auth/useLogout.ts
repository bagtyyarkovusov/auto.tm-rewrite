import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { apiClient } from "../api/client";

import { loadAuthSession, clearAuthSession } from "./session";

import { useToast } from "@/components/ui/toast";

/** Logging out lands on Cabinet, signed out, with a short "Signed out" message. */
export function useLogout() {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const { t } = useTranslation("account");

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
      router.dismissTo("/(tabs)/services");
      show({ title: t("signedOut") });
    },
  });
}
