import { createRequire } from "node:module";

import type * as Native from "react-native";
import * as React from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderMobile } from "../render";
import RootLayout, { unstable_settings } from "../../app/_layout";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => "true"), setItem: vi.fn(async () => {}), removeItem: vi.fn(async () => {}) },
}));
vi.mock("expo-font", () => ({ useFonts: () => [true] }));
vi.mock("expo-splash-screen", () => ({ preventAutoHideAsync: vi.fn(), hide: vi.fn() }));
vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));
vi.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "en" }] }));
vi.mock("@react-native-community/netinfo", () => ({ default: {
  fetch: async () => ({ isConnected: true }), addEventListener: () => () => {},
} }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: ({ children }: React.PropsWithChildren) => <View>{children}</View>, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock("react-native-gesture-handler", () => ({ GestureHandlerRootView: ({ children }: React.PropsWithChildren) => <View>{children}</View> }));
vi.mock("@react-navigation/native", () => ({ ThemeProvider: ({ children }: React.PropsWithChildren) => <View>{children}</View>, DefaultTheme: { colors: {} }, DarkTheme: { colors: {} } }));
vi.mock("expo-notifications", () => ({ DEFAULT_ACTION_IDENTIFIER: "default", getLastNotificationResponse: () => null, addNotificationResponseReceivedListener: () => ({ remove() {} }) }));
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///documents/" }));
vi.mock("expo-router", async () => {
  // Model the public Stack guard boundary. This proves route eligibility, not native Back dispatch.
  const native = await import("react-native");
  const Stack = Object.assign(({ children }: React.PropsWithChildren) => <native.View>{children}</native.View>, {
    Screen: ({ name }: { name: string }) => <native.View testID={name} />,
    Protected: ({ guard, children }: React.PropsWithChildren<{ guard: boolean }>) => guard ? children : null,
  });
  return { Stack, router: { replace: vi.fn() }, usePathname: () => "/", useRootNavigationState: () => ({ routes: [{ name: "(tabs)" }], index: 0 }) };
});

beforeEach(() => {
  createRequire(import.meta.url).extensions[".ttf"] = (module) => { module.exports = {}; };
  vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => key === "@auto-tm/onboarding-completed" ? "true" : null);
});

describe("Root Back anchor", () => {
  it("uses the tabs as the deep-link Back anchor", () => {
    expect(unstable_settings.initialRouteName).toBe("(tabs)");
  });
  it("mounts navigation without waiting for the onboarding storage read", async () => {
    vi.mocked(AsyncStorage.getItem).mockImplementation((key) =>
      key === "@auto-tm/onboarding-completed" ? new Promise(() => {}) : Promise.resolve(null),
    );
    const screen = renderMobile(<RootLayout />);
    await act(async () => {});
    expect(screen.getByTestId("(tabs)")).toBeTruthy();
    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith("@auto-tm/onboarding-completed");
  });
});

vi.mock("react-native", async (original) => ({
  ...await original<typeof Native>(),
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
