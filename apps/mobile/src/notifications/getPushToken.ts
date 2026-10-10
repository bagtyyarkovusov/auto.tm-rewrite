import * as Notifications from "expo-notifications";

import type { PushPlatform } from "./types";
import { getPlatform } from "./getPlatform";

export interface NativePushToken {
  token: string;
  platform: PushPlatform;
}

export type NativePushTokenResult =
  | { status: "ok"; token: string; platform: PushPlatform }
  | { status: "unsupported-platform" }
  | { status: "empty-token" }
  | { status: "fetch-failed"; error: unknown };

/**
 * Reads the native FCM/APNS token. Never throws and never fails silently:
 * every non-ok outcome says why, and native failures are logged so a missing
 * registration is diagnosable. Devices without Google Play services and
 * unreachable FCM (VPN routes) both surface as `fetch-failed`; the caller
 * decides whether to retry.
 */
export async function getNativePushToken(): Promise<NativePushTokenResult> {
  const platform = getPlatform();

  // getDevicePushTokenAsync only yields native FCM/APNS tokens on iOS/Android.
  // Web is not a native push target for this flow, so treat it as unavailable.
  if (platform === "web") {
    return { status: "unsupported-platform" };
  }

  let deviceToken;
  try {
    deviceToken = await Notifications.getDevicePushTokenAsync();
  } catch (error) {
    console.warn("[pushToken] native token fetch failed", error);
    return { status: "fetch-failed", error };
  }

  if (!deviceToken.data || typeof deviceToken.data !== "string") {
    console.warn("[pushToken] native token fetch returned no token");
    return { status: "empty-token" };
  }

  return {
    status: "ok",
    token: deviceToken.data,
    platform,
  };
}
