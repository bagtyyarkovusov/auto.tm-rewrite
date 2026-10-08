import { createRequire } from "node:module";

import type * as Native from "react-native";
import {
  BaseNavigationContainer,
  StackActions,
  StackRouter,
  createNavigationContainerRef,
  createNavigatorFactory,
  useNavigationBuilder,
  type ParamListBase,
} from "@react-navigation/core";
import * as React from "react";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderMobile } from "../render";
import RootLayout, { unstable_settings } from "../../app/_layout";

const FLAG = "@auto-tm/onboarding-completed";
const LOCALE = "@auto-tm/locale";
const LANGUAGE = "/(onboarding)/language";

const launch = vi.hoisted(() => ({
  pathname: "/",
  stored: {} as Record<string, string>,
  push: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => launch.stored[key] ?? null),
    getAllKeys: vi.fn(async () => Object.keys(launch.stored)),
    setItem: vi.fn(async (key: string, value: string) => { launch.stored[key] = value; }),
    removeItem: vi.fn(async () => {}),
  },
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
  // Model the root Stack's screens. This proves what the launch asks the router
  // to do, not native Back dispatch; the last test runs a real stack router.
  const native = await import("react-native");
  const Stack = Object.assign(({ children }: React.PropsWithChildren) => <native.View>{children}</native.View>, {
    Screen: ({ name }: { name: string }) => <native.View testID={name} />,
  });
  return {
    Stack,
    router: { replace: vi.fn(), push: launch.push },
    usePathname: () => launch.pathname,
    useRootNavigationState: () => ({ routes: [{ name: "(tabs)" }], index: 0 }),
  };
});

// The signed-in case is decided in `onboardingGate.spec.ts`; a session here
// would start the signed-in root effects, which this spec does not model.
async function launchApp() {
  const screen = renderMobile(<RootLayout />);
  await act(async () => {});
  await act(async () => {});
  return screen;
}

beforeEach(() => {
  createRequire(import.meta.url).extensions[".ttf"] = (module) => { module.exports = {}; };
  launch.pathname = "/";
  launch.stored = {};
  launch.push.mockClear();
  vi.mocked(SplashScreen.hide).mockClear();
  vi.mocked(AsyncStorage.getItem).mockClear();
  vi.mocked(AsyncStorage.getAllKeys).mockClear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => launch.stored[key] ?? null);
});

describe("Root Back anchor", () => {
  it("uses the tabs as the deep-link Back anchor", () => {
    expect(unstable_settings.initialRouteName).toBe("(tabs)");
  });

  it("mounts the tabs before the onboarding group, so onboarding is never underneath Home", async () => {
    launch.stored = { [FLAG]: "true" };
    const screen = await launchApp();

    type Node = { type: unknown; props: { testID?: string } };
    const names = screen.UNSAFE_root
      .findAll((node: Node) => typeof node.type === "string" && Boolean(node.props.testID))
      .map((node: Node) => node.props.testID);
    expect(names.indexOf("(tabs)")).toBeLessThan(names.indexOf("(onboarding)"));
    expect(names.indexOf("(tabs)")).toBe(0);
  });
});

describe("Onboarding on launch", () => {
  it("opens the Language screen above the tabs on a fresh install", async () => {
    const screen = await launchApp();

    expect(screen.getByTestId("(tabs)")).toBeTruthy();
    expect(launch.push).toHaveBeenCalledTimes(1);
    expect(launch.push).toHaveBeenCalledWith(LANGUAGE);
    expect(launch.stored[FLAG]).toBe("pending");
    // The Language screen lets the launch screen go, so Home is not seen first.
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it("reads storage before the launch reads the language, so nothing can be written first", async () => {
    await launchApp();

    const keysRead = vi.mocked(AsyncStorage.getAllKeys).mock.invocationCallOrder[0] ?? Infinity;
    const localeRead = vi.mocked(AsyncStorage.getItem).mock.invocationCallOrder[
      vi.mocked(AsyncStorage.getItem).mock.calls.findIndex(([key]) => key === LOCALE)
    ] ?? -1;
    expect(keysRead).toBeLessThan(localeRead);
  });

  it("goes straight to Home for someone who already has a stored language", async () => {
    launch.stored = { [LOCALE]: "tk" };
    const screen = await launchApp();

    expect(screen.getByTestId("(tabs)")).toBeTruthy();
    expect(launch.push).not.toHaveBeenCalled();
    expect(launch.stored[FLAG]).toBe("true");
    expect(SplashScreen.hide).toHaveBeenCalled();
  });

  it("lets a deep link win on a fresh install and keeps onboarding for the next plain start", async () => {
    launch.pathname = "/listings/550e8400-e29b-41d4-a716-446655440000";
    const screen = await launchApp();

    expect(screen.getByTestId("(tabs)")).toBeTruthy();
    expect(launch.push).not.toHaveBeenCalled();
    expect(SplashScreen.hide).toHaveBeenCalled();
    expect(launch.stored[FLAG]).toBe("pending");
  });

  it("opens Home without onboarding after one second of slow storage", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(AsyncStorage.getItem).mockImplementation((key) =>
      key === FLAG ? new Promise(() => {}) : Promise.resolve(null),
    );
    const screen = renderMobile(<RootLayout />);
    await act(async () => {});
    expect(screen.queryByTestId("(tabs)")).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    expect(screen.getByTestId("(tabs)")).toBeTruthy();
    expect(launch.push).not.toHaveBeenCalled();
    expect(SplashScreen.hide).toHaveBeenCalled();
  });
});

describe("Back after onboarding", () => {
  it("never opens onboarding again once it was finished, so publishing a Listing cannot go Back to it", async () => {
    launch.stored = { [FLAG]: "true", [LOCALE]: "ru" };
    await launchApp();

    expect(launch.push).not.toHaveBeenCalled();
  });

  // Real NavigationBuilder and StackRouter manage history. `push` and
  // `dismissTo` are the two calls the launch and the last onboarding button make.
  it("leaves only the tabs in history after onboarding ends, through publish, Edit and Back", () => {
    const navigation = createNavigationContainerRef<ParamListBase>();
    const detail = "/(public)/listings/1";
    const Navigator = createNavigatorFactory(function TestStack({ children }: { children: React.ReactNode }) {
      const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, {
        children, initialRouteName: unstable_settings.initialRouteName,
      });
      return <NavigationContent>{state.routes.map((route) => (
        <View key={route.key}>{descriptors[route.key]?.render()}</View>
      ))}</NavigationContent>;
    })();
    const names = () => navigation.getRootState().routes.map((route) => route.name);
    renderMobile(<BaseNavigationContainer ref={navigation}>
      <Navigator.Navigator>
        <Navigator.Screen name="(tabs)">{() => <Text>Home</Text>}</Navigator.Screen>
        <Navigator.Screen name="(onboarding)">{() => <Text>Onboarding</Text>}</Navigator.Screen>
        <Navigator.Screen name={detail}>{() => <Text>Published detail</Text>}</Navigator.Screen>
        <Navigator.Screen name="edit">{() => <Text>Edit listing</Text>}</Navigator.Screen>
      </Navigator.Navigator>
    </BaseNavigationContainer>);

    // First launch: onboarding opens above Home.
    act(() => navigation.dispatch(StackActions.push("(onboarding)")));
    expect(names()).toEqual(["(tabs)", "(onboarding)"]);
    // Skip or "Browse listings": `router.dismissTo(HOME_HREF)` pops to the tabs.
    act(() => navigation.dispatch(StackActions.popTo("(tabs)")));
    expect(names()).toEqual(["(tabs)"]);

    // Defect 6 of the release emulator pass: publish, open and close Edit, Back, Back.
    act(() => navigation.dispatch(StackActions.push(detail)));
    act(() => navigation.dispatch(StackActions.push("edit")));
    act(() => navigation.goBack());
    act(() => navigation.goBack());
    expect(navigation.getCurrentRoute()?.name).toBe("(tabs)");
    expect(navigation.canGoBack()).toBe(false);
    expect(names()).toEqual(["(tabs)"]);
  });
});

vi.mock("react-native", async (original) => ({
  ...await original<typeof Native>(),
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
