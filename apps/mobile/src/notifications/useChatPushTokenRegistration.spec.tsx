// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  requestPermissionsAsync,
  getPermissionsAsync,
  getDevicePushTokenAsync,
  setNotificationChannelAsync,
  PermissionStatus,
  AndroidImportance,
} from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useChatPushTokenRegistration } from "./useChatPushTokenRegistration";

const mockMutate = vi.fn();

vi.mock("../api/notifications/useRegisterPushToken", () => ({
  useRegisterPushToken: () => ({ mutate: mockMutate }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock("expo-notifications", () => ({
  requestPermissionsAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  getDevicePushTokenAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
  AndroidImportance: {
    HIGH: 5,
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1,
  },
}));

vi.mock("./getPlatform", () => ({
  getPlatform: vi.fn(() => "android"),
}));

const mockRequestPermissionsAsync = vi.mocked(requestPermissionsAsync);
const mockGetPermissionsAsync = vi.mocked(getPermissionsAsync);
const mockGetDevicePushTokenAsync = vi.mocked(getDevicePushTokenAsync);
const mockSetNotificationChannelAsync = vi.mocked(setNotificationChannelAsync);
const mockAsyncStorage = vi.mocked(AsyncStorage);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useChatPushTokenRegistration", () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockRequestPermissionsAsync.mockReset();
    mockGetPermissionsAsync.mockReset();
    mockGetDevicePushTokenAsync.mockReset();
    mockSetNotificationChannelAsync.mockReset();
    mockAsyncStorage.getItem.mockReset();
    mockAsyncStorage.setItem.mockReset();
  });

  it("sets up the Android direct-message channel", async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      expires: "never",
      canAskAgain: true,
    });
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: "fcm-token-1", type: "android" });

    renderHook(() => useChatPushTokenRegistration(true), { wrapper });

    await waitFor(() =>
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
        "direct-messages",
        expect.objectContaining({
          name: "Direct messages",
          importance: AndroidImportance.HIGH,
        }),
      ),
    );
  });

  it("registers the native token when permission is already granted", async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      expires: "never",
      canAskAgain: true,
    });
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: "apns-token-1", type: "ios" });

    renderHook(() => useChatPushTokenRegistration(true), { wrapper });

    await waitFor(() => expect(mockMutate).toHaveBeenCalled());

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "apns-token-1",
        platform: expect.stringMatching(/android|ios/),
      }),
    );
  });

  it("requests permission and registers when permission is undetermined", async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      expires: "never",
      canAskAgain: true,
    });
    mockRequestPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      expires: "never",
      canAskAgain: true,
    });
    mockGetDevicePushTokenAsync.mockResolvedValue({ data: "fcm-token-2", type: "android" });

    renderHook(() => useChatPushTokenRegistration(true), { wrapper });

    await waitFor(() => expect(mockRequestPermissionsAsync).toHaveBeenCalled());
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ token: "fcm-token-2" }),
    );
  });

  it("does not re-prompt after the first ask", async () => {
    mockAsyncStorage.getItem.mockResolvedValue("true");
    mockGetPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      expires: "never",
      canAskAgain: true,
    });

    renderHook(() => useChatPushTokenRegistration(true), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("keeps chat usable when permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      expires: "never",
      canAskAgain: false,
    });

    renderHook(() => useChatPushTokenRegistration(true), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does nothing when disabled", async () => {
    renderHook(() => useChatPushTokenRegistration(false), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
