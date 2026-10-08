import * as Notifications from "expo-notifications";

import type { NotificationPermissionState } from "./types";
import { getPlatform } from "./getPlatform";

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const settings = await Notifications.getPermissionsAsync();

    if (settings.granted) {
      return "granted";
    }

    if (settings.status === Notifications.PermissionStatus.DENIED) {
      // Android 13+ also reports DENIED before the first system prompt.
      // The registration hook's persisted ask record prevents re-prompting
      // an actual refusal; iOS keeps its native denial semantics.
      if (getPlatform() === "android" && settings.canAskAgain) return "undetermined";
      return "denied";
    }

    return "undetermined";
  } catch {
    return "unavailable";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (status === Notifications.PermissionStatus.GRANTED) {
      return "granted";
    }

    return "denied";
  } catch {
    return "unavailable";
  }
}
