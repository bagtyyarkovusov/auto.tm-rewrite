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

    return {
      token: deviceToken.data,
      platform: platform === "web" ? "android" : platform,
    };
  } catch {
    return null;
  }
}
