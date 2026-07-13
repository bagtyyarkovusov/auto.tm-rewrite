import * as Notifications from "expo-notifications";

import type { PushPlatform } from "./types";
import { getPlatform } from "./getPlatform";

export interface NativePushToken {
  token: string;
  platform: PushPlatform;
}

export async function getNativePushToken(): Promise<NativePushToken | null> {
  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();

    if (!deviceToken.data || typeof deviceToken.data !== "string") {
      return null;
    }

    const platform = getPlatform();

    // getDevicePushTokenAsync only yields native FCM/APNS tokens on iOS/Android.
    // Web is not a native push target for this flow, so treat it as unavailable.
    if (platform === "web") {
      return null;
    }

    return {
      token: deviceToken.data,
      platform,
    };
  } catch {
    return null;
  }
}
