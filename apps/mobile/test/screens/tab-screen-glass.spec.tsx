import { beforeEach, expect, it, vi } from "vitest";

import { renderMobile } from "../render";
import { Text } from "../../components/ui/text";

const settings = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/lib/motion", () => ({ useReduceTransparency: () => settings.reduced }));
vi.mock("../../components/navigation/ScrollEdgeFade", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  return { ScrollEdgeFade: () => React.createElement(View, { testID: "edge-fade" }) };
});
vi.mock("react-native-safe-area-context", async () => {
  const { View } = await import("react-native");
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
vi.mock("expo-blur", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  return {
    BlurView: (props: object) => React.createElement(View, { ...props, testID: "chip-blur" }),
    BlurTargetView: (props: object) => React.createElement(View, { ...props, testID: "screen-backdrop" }),
  };
});

beforeEach(() => { settings.reduced = false; vi.resetModules(); });

/** Loads the screen root as the given device, with a glass chip floated over the list. */
async function screen(os: "ios" | "android", version: number, overlay: boolean) {
  const { Platform } = await import("react-native");
  Object.assign(Platform, { OS: os, Version: version });
  const { TabScreen } = await import("../../components/navigation/TabScreen");
  const { GlassSurface } = await import("../../components/ui/glass-surface");
  const chip = <GlassSurface className="rounded-full"><Text>Filters</Text></GlassSurface>;
  return renderMobile(<TabScreen underTabBar overlay={overlay ? chip : undefined}><Text>Listings</Text></TabScreen>);
}

it.each([["ios", 18], ["android", 31]] as const)("lets the list show through the blurred tab bar on %s %s", async (os, version) => {
  const view = await screen(os, version, false);
  expect(view.queryByTestId("edge-fade")).toBeNull();
  expect(view.getByText("Listings")).toBeTruthy();
});

it("keeps the edge fade under a tab bar that cannot blur", async () => {
  expect((await screen("android", 30, false)).getByTestId("edge-fade")).toBeTruthy();
});

it("keeps the edge fade when Reduce Transparency makes the bar opaque", async () => {
  settings.reduced = true;
  expect((await screen("ios", 18, false)).getByTestId("edge-fade")).toBeTruthy();
});

it("gives a floated chip the screen's content to blur on Android 12", async () => {
  const view = await screen("android", 31, true);
  const backdrop = view.getByTestId("screen-backdrop");
  // The list is inside the blurred view; the chip is outside it.
  expect(view.getByText("Listings")).toBeTruthy();
  expect(backdrop.findAllByProps({ testID: "chip-blur" })).toHaveLength(0);
  expect(view.getByTestId("chip-blur").props.blurTarget).toBeDefined();
});

it("floats the chip on the tuned surface on Android 11, with no blur", async () => {
  const view = await screen("android", 30, true);
  expect(view.queryByTestId("screen-backdrop")).toBeNull();
  expect(view.queryByTestId("chip-blur")).toBeNull();
  expect(view.getByText("Filters")).toBeTruthy();
});
