import * as Notifications from "expo-notifications";

import type { NotificationPermissionState } from "./types";

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const settings = await Notifications.getPermissionsAsync();

    if (settings.granted) {
      return "granted";
    }

    if (settings.status === Notifications.PermissionStatus.DENIED) {
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
