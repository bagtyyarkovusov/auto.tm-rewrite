import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useRegisterPushToken } from "../api/notifications/useRegisterPushToken";

import { getNativePushToken } from "./getPushToken";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
} from "./requestNotificationPermission";
import { setDirectMessageChannel } from "./setDirectMessageChannel";

const ASKED_KEY = "notifications.permissionAsked";

async function hasAskedBefore(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ASKED_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

async function markAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(ASKED_KEY, "true");
  } catch {
    // Best-effort persistence; a re-prompt on next launch is acceptable.
  }
}

/**
 * Requests notification permission in a chat-relevant context and registers
 * the native FCM/APNS token through the API when permission is granted.
 *
 * The prompt is shown at most once. Denied or unavailable states are handled
 * gracefully so chat remains usable without push.
 */
export function useChatPushTokenRegistration(enabled: boolean) {
  const { mutate: registerPushToken } = useRegisterPushToken();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!enabled || hasRun.current) {
      return;
    }
    hasRun.current = true;

    let cancelled = false;

    async function run() {
      // Android channel must exist before the permission prompt is shown.
      await setDirectMessageChannel();

      const state = await getNotificationPermissionState();

      if (state === "granted") {
        const nativeToken = await getNativePushToken();
        if (nativeToken && !cancelled) {
          registerPushToken(nativeToken);
        }
        return;
      }

      if (state === "denied" || state === "unavailable") {
        // Do not block chat; user can enable later from settings.
        return;
      }

      const asked = await hasAskedBefore();
      if (asked) {
        return;
      }

      await markAsked();
      const result = await requestNotificationPermission();

      if (result === "granted" && !cancelled) {
        const nativeToken = await getNativePushToken();
        if (nativeToken && !cancelled) {
          registerPushToken(nativeToken);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, registerPushToken]);
}
