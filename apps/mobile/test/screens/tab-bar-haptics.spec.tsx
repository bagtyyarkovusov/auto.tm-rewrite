import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Platform, View } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, renderMobile } from "../render";
import { AutoTmTabBar } from "../../components/navigation/AutoTmTabBar";

const gestures = vi.hoisted(() => ({ handlers: {} as Record<string, (event: { x: number }) => void> }));
vi.mock("react-native-gesture-handler", async () => {
  const { View } = await import("react-native");
  const builder = () => {
    const chain = new Proxy({}, { get: (_, name: string) => (...args: unknown[]) => {
      if (name.startsWith("on")) gestures.handlers[name] = args[0] as (event: { x: number }) => void;
      return chain;
    } });
    return chain;
  };
  return { GestureHandlerRootView: View, GestureDetector: ({ children }: { children: unknown }) => children, Gesture: { Pan: builder } };
});
vi.mock("@react-navigation/native", () => ({
  CommonActions: { navigate: (name: string, params?: object) => ({ type: "NAVIGATE", payload: { name, params } }) },
}));
vi.mock("expo-notifications", () => ({ addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })) }));

const routes = ["(search)", "favorites", "sell", "chat", "services"].map((name) => ({ key: name, name, params: undefined }));
function renderBar(prevented = false) {
  const navigation = { emit: vi.fn(() => ({ defaultPrevented: prevented })), dispatch: vi.fn() };
  const props = {
    state: { index: 0, key: "tabs", routes },
    descriptors: Object.fromEntries(routes.map((route) => [route.key, { options: {} }])), navigation,
  } as unknown as BottomTabBarProps;
  const view = renderMobile(<AutoTmTabBar {...props} />);
  const bar = view.UNSAFE_getAllByType(View).find((node) => node.props.accessibilityRole === "tablist");
  act(() => bar!.props.onLayout({ nativeEvent: { layout: { width: 358 } } }));
  return { view, navigation };
}
beforeEach(() => { vi.clearAllMocks(); Platform.OS = "ios"; });

describe("Tab bar selection feedback", () => {
  it("ticks once when a tap opens Favorites", () => {
    const { view, navigation } = renderBar();
    fireEvent.press(view.getByRole("tab", { name: "Favorites" }));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledTimes(1);
  });
  it("does not tick when the open tab is tapped", () => {
    const { view } = renderBar();
    fireEvent.press(view.getByRole("tab", { name: "Search" }));
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
  it("does not tick when tab selection is prevented", () => {
    const { view, navigation } = renderBar(true);
    fireEvent.press(view.getByRole("tab", { name: "Favorites" }));
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });
  it("uses Android's clock tick for a tab tap", () => {
    Platform.OS = "android";
    const { view } = renderBar();
    fireEvent.press(view.getByRole("tab", { name: "Favorites" }));
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledWith("clock-tick");
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
  it("ticks once per crossed tab and does not add a tick on slide release", () => {
    const { navigation } = renderBar();
    act(() => {
      gestures.handlers.onBegin!({ x: 35 });
      gestures.handlers.onStart!({ x: 35 });
      gestures.handlers.onUpdate!({ x: 110 });
      gestures.handlers.onUpdate!({ x: 115 });
      gestures.handlers.onUpdate!({ x: 185 });
      gestures.handlers.onUpdate!({ x: 185 });
      gestures.handlers.onEnd!({ x: 185 });
    });
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    expect(navigation.dispatch).toHaveBeenCalledTimes(1);
  });
});
