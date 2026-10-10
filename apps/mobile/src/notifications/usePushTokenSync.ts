import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useRegisterPushToken } from "../api/notifications/useRegisterPushToken";
import { pushTokensQueryOptions } from "../api/notifications/usePushTokens";

import { getNativePushToken } from "./getPushToken";
import { getNotificationPermissionState } from "./requestNotificationPermission";

/**
 * Keeps the device's push token registered while a User is signed in. Runs on
 * app launch and on every return to the foreground, because the first
 * registration attempt can fail offline or with FCM unreachable and the
 * native token can rotate. It never prompts: only an already-granted
 * permission proceeds. A run fetches the server-registered tokens and POSTs
 * only when the current native token is missing, so a steady state costs one
 * cached read. Every failure is logged and retried on the next launch or
 * foreground, so chat stays usable while push is degraded.
 */
export function usePushTokenSync(): void {
  const queryClient = useQueryClient();
  const { mutateAsync: registerPushToken } = useRegisterPushToken();
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (syncing.current) {
      return;
    }
    syncing.current = true;

    try {
      const permission = await getNotificationPermissionState();
      if (permission !== "granted") {
        return;
      }

      const result = await getNativePushToken();
      // A failure is already logged by getNativePushToken; the next launch or
      // foreground retries.
      if (result.status !== "ok") {
        return;
      }

      const registered = await queryClient.fetchQuery(pushTokensQueryOptions());
      if (registered.items.some((item) => item.token === result.token)) {
        return;
      }

      await registerPushToken({
        token: result.token,
        platform: result.platform,
      });
    } catch (error) {
      console.warn("[pushTokenSync] registration sync failed", error);
    } finally {
      syncing.current = false;
    }
  }, [queryClient, registerPushToken]);

  useEffect(() => {
    void sync();

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void sync();
      }
    });

    return () => subscription.remove();
  }, [sync]);
}
