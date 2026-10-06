import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, renderMobile } from "../render";
import { AutoTmTabBar } from "../../components/navigation/AutoTmTabBar";

vi.mock("../../src/api/client", () => ({
  apiClient: { get: vi.fn(async () => ({ count: 0 })), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
vi.mock("../../src/auth/useViewer", () => ({ useViewer: () => null }));
vi.mock("@react-navigation/native", () => ({
  CommonActions: { navigate: (name: string, params?: object) => ({ type: "NAVIGATE", payload: { name, params } }) },
}));
vi.mock("expo-notifications", () => ({
  addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
}));

const routes = ["(search)", "favorites", "sell", "chat", "services"].map((name) => ({
  key: name,
  name,
  params: undefined,
}));

function renderBar() {
  const navigation = { emit: vi.fn(() => ({ defaultPrevented: false })), dispatch: vi.fn() };
  const props = {
    state: { index: 0, key: "tabs", routes },
    descriptors: Object.fromEntries(routes.map((route) => [route.key, { options: {} }])),
    navigation,
  } as unknown as BottomTabBarProps;
  return { view: renderMobile(<AutoTmTabBar {...props} />), navigation };
}

beforeEach(() => {
  vi.mocked(Haptics.selectionAsync).mockClear();
});

describe("Tab bar touch feedback", () => {
  it("ticks once when a tap chooses another tab, and still navigates", () => {
    const { view, navigation } = renderBar();
    fireEvent.press(view.getByRole("tab", { name: "Favorites" }));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).toHaveBeenCalledTimes(1);
  });

  it("stays still when the open tab is tapped again", () => {
    const { view, navigation } = renderBar();
    fireEvent.press(view.getByRole("tab", { name: "Search" }));
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(navigation.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "tabPress" }));
  });
});
