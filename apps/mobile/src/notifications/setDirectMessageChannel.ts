import * as Notifications from "expo-notifications";

import { getPlatform } from "./getPlatform";

export const DIRECT_MESSAGE_CHANNEL_ID = "direct-messages";

export async function setDirectMessageChannel(): Promise<void> {
  if (getPlatform() !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(DIRECT_MESSAGE_CHANNEL_ID, {
    name: "Direct messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    showBadge: true,
  });
}
