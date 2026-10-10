import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDevicePushTokenAsync } from "expo-notifications";

import { getPlatform } from "./getPlatform";
import { getNativePushToken } from "./getPushToken";

vi.mock("expo-notifications", () => ({
  getDevicePushTokenAsync: vi.fn(),
}));

vi.mock("./getPlatform", () => ({
  getPlatform: vi.fn(() => "android"),
}));

const mockGetDevicePushTokenAsync = vi.mocked(getDevicePushTokenAsync);

describe("getNativePushToken", () => {
  beforeEach(() => {
    vi.mocked(getPlatform).mockReturnValue("android");
    mockGetDevicePushTokenAsync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the native token with its platform", async () => {
    mockGetDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-token-1",
      type: "android",
    });

    await expect(getNativePushToken()).resolves.toEqual({
      status: "ok",
      token: "fcm-token-1",
      platform: "android",
    });
  });

  it("reports web as unsupported without calling the native module", async () => {
    vi.mocked(getPlatform).mockReturnValue("web");

    await expect(getNativePushToken()).resolves.toEqual({
      status: "unsupported-platform",
    });
    expect(mockGetDevicePushTokenAsync).not.toHaveBeenCalled();
  });

  it("reports and logs an empty native response", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: "", type: "android" });

    await expect(getNativePushToken()).resolves.toEqual({
      status: "empty-token",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("[pushToken]"),
    );
  });

  it("logs and reports a fetch failure instead of swallowing it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Devices without Google Play services and unreachable FCM (VPN routes)
    // both reject here; the failure must stay diagnosable.
    const failure = new Error("FIS_AUTH_ERROR");
    mockGetDevicePushTokenAsync.mockRejectedValue(failure);

    await expect(getNativePushToken()).resolves.toEqual({
      status: "fetch-failed",
      error: failure,
    });
    expect(warn).toHaveBeenCalledWith(
      "[pushToken] native token fetch failed",
      failure,
    );
  });
});
