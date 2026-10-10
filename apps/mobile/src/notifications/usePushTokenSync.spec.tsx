// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getPermissionsAsync,
  getDevicePushTokenAsync,
  requestPermissionsAsync,
  PermissionStatus,
} from "expo-notifications";

import { getPlatform } from "./getPlatform";
import { usePushTokenSync } from "./usePushTokenSync";

const appState = vi.hoisted(() => ({
  listeners: new Set<(status: string) => void>(),
}));

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_: string, listener: (status: string) => void) => {
      appState.listeners.add(listener);
      return { remove: () => appState.listeners.delete(listener) };
    },
  },
}));

const mockRegisterAsync = vi.fn();

vi.mock("../api/notifications/useRegisterPushToken", () => ({
  useRegisterPushToken: () => ({ mutateAsync: mockRegisterAsync }),
}));

const mockApiGet = vi.fn();

vi.mock("../api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public status: number,
      message?: string,
    ) {
      super(message ?? code);
      this.name = "ApiError";
    }
  },
}));

vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn(),
  getDevicePushTokenAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
}));

vi.mock("./getPlatform", () => ({
  getPlatform: vi.fn(() => "android"),
}));

const mockGetPermissionsAsync = vi.mocked(getPermissionsAsync);
const mockGetDevicePushTokenAsync = vi.mocked(getDevicePushTokenAsync);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function grantPermission() {
  mockGetPermissionsAsync.mockResolvedValue({
    status: PermissionStatus.GRANTED,
    granted: true,
    expires: "never",
    canAskAgain: true,
  });
}

function denyPermission() {
  mockGetPermissionsAsync.mockResolvedValue({
    status: PermissionStatus.DENIED,
    granted: false,
    expires: "never",
    canAskAgain: false,
  });
}

describe("usePushTokenSync", () => {
  beforeEach(() => {
    appState.listeners.clear();
    vi.mocked(getPlatform).mockReturnValue("android");
    mockRegisterAsync.mockReset();
    mockApiGet.mockReset();
    mockGetPermissionsAsync.mockReset();
    mockGetDevicePushTokenAsync.mockReset();
    vi.mocked(requestPermissionsAsync).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the native token on launch when permission is granted and the server has none", async () => {
    grantPermission();
    mockGetDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-token-1",
      type: "android",
    });
    mockApiGet.mockResolvedValue({ items: [] });

    renderHook(() => usePushTokenSync(), { wrapper });

    await waitFor(() =>
      expect(mockRegisterAsync).toHaveBeenCalledWith({
        token: "fcm-token-1",
        platform: "android",
      }),
    );
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("skips the POST when the server already has the current token", async () => {
    grantPermission();
    mockGetDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-token-1",
      type: "android",
    });
    mockApiGet.mockResolvedValue({ items: [{ token: "fcm-token-1" }] });

    renderHook(() => usePushTokenSync(), { wrapper });

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    await act(async () => {});
    expect(mockRegisterAsync).not.toHaveBeenCalled();
  });

  it("re-registers when the native token rotated", async () => {
    grantPermission();
    mockGetDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-token-new",
      type: "android",
    });
    mockApiGet.mockResolvedValue({ items: [{ token: "fcm-token-old" }] });

    renderHook(() => usePushTokenSync(), { wrapper });

    await waitFor(() =>
      expect(mockRegisterAsync).toHaveBeenCalledWith({
        token: "fcm-token-new",
        platform: "android",
      }),
    );
  });

  it("logs a token-fetch failure and retries on the next foreground", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    grantPermission();
    // FCM unreachable (VPN route) on the first attempt.
    mockGetDevicePushTokenAsync.mockRejectedValueOnce(
      new Error("FCM unreachable"),
    );

    renderHook(() => usePushTokenSync(), { wrapper });

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        "[pushToken] native token fetch failed",
        expect.any(Error),
      ),
    );
    expect(mockRegisterAsync).not.toHaveBeenCalled();

    mockGetDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-token-2",
      type: "android",
    });
    mockApiGet.mockResolvedValue({ items: [] });

    await act(async () => {
      appState.listeners.forEach((listener) => listener("active"));
    });

    await waitFor(() =>
      expect(mockRegisterAsync).toHaveBeenCalledWith({
        token: "fcm-token-2",
        platform: "android",
      }),
    );
  });

  it("retries on foreground when the server token list could not be read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    grantPermission();
    mockGetDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-token-1",
      type: "android",
    });
    mockApiGet.mockRejectedValueOnce(new Error("offline"));

    renderHook(() => usePushTokenSync(), { wrapper });

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());
    await act(async () => {});
    expect(mockRegisterAsync).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[pushTokenSync] registration sync failed",
      expect.any(Error),
    );

    mockApiGet.mockResolvedValue({ items: [] });
    await act(async () => {
      appState.listeners.forEach((listener) => listener("active"));
    });

    await waitFor(() =>
      expect(mockRegisterAsync).toHaveBeenCalledWith({
        token: "fcm-token-1",
        platform: "android",
      }),
    );
  });

  it("does nothing when permission is denied and never prompts", async () => {
    denyPermission();

    renderHook(() => usePushTokenSync(), { wrapper });

    await waitFor(() => expect(mockGetPermissionsAsync).toHaveBeenCalled());
    await act(async () => {});
    expect(mockGetDevicePushTokenAsync).not.toHaveBeenCalled();
    expect(mockRegisterAsync).not.toHaveBeenCalled();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("stops listening for the foreground on unmount", async () => {
    denyPermission();
    const hook = renderHook(() => usePushTokenSync(), { wrapper });
    expect(appState.listeners.size).toBe(1);

    hook.unmount();
    expect(appState.listeners.size).toBe(0);
  });
});
