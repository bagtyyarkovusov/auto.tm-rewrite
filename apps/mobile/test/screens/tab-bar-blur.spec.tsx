import { createRef, type ComponentProps } from "react";
import { Platform, View } from "react-native";
import { beforeEach, expect, it, vi } from "vitest";

import { renderMobile } from "../render";
import { Text } from "../../components/ui/text";
import { GlassBackdrop, GlassSurface } from "../../components/ui/glass-surface";

const settings = vi.hoisted(() => ({ reduced: false, dark: false }));
vi.mock("@/lib/motion", () => ({ useReduceTransparency: () => settings.reduced }));
vi.mock("nativewind", () => ({ cssInterop: vi.fn(), useColorScheme: () => ({ colorScheme: settings.dark ? "dark" : "light" }) }));
vi.mock("expo-blur", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  return { BlurView: (props: object) => React.createElement(View, { ...props, testID: "native-blur" }), BlurTargetView: View };
});
beforeEach(() => { settings.reduced = false; settings.dark = false; Platform.OS = "android"; });
const target = createRef<View>();
/** Every class on the surface and its material layers. */
const classNames = (view: ReturnType<typeof renderMobile>) =>
  view.UNSAFE_getAllByType(View).flatMap((node) => String(node.props.className ?? "").split(/\s+/));
function surface(withTarget = true) {
  const props = { blurTarget: withTarget ? target : undefined, accessibilityLabel: "Tab material" } as ComponentProps<typeof GlassSurface>;
  return renderMobile(<GlassSurface {...props}><Text>Favorites</Text></GlassSurface>);
}
it.each([false, true])("samples the focused screen with readable content in dark=%s", (dark) => {
  settings.dark = dark;
  const view = surface();
  expect(view.getByText("Favorites")).toBeTruthy();
  expect(view.getByTestId("native-blur").props).toMatchObject({ blurTarget: target, blurMethod: "dimezisBlurViewSdk31Plus", intensity: 20, blurReductionFactor: 1, tint: dark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight" });
  expect(classNames(view)).toContain("bg-glass/glass-frosted");
});
it("blurs a surface floated over the screen's own backdrop", () => {
  const view = renderMobile(<GlassBackdrop.Provider value={target}><GlassSurface><Text>Filters</Text></GlassSurface></GlassBackdrop.Provider>);
  expect(view.getByTestId("native-blur").props.blurTarget).toBe(target);
});
it("blurs on iOS below 26 without a target", () => {
  Platform.OS = "ios";
  const view = surface(false);
  expect(view.getByTestId("native-blur").props).toMatchObject({ intensity: 70, tint: "systemUltraThinMaterialLight" });
  expect(view.getByTestId("native-blur").props.blurMethod).toBeUndefined();
  expect(classNames(view)).toContain("bg-glass/glass-frosted");
});
it("clips the material to the surface's radius and leaves the surface its shadow", () => {
  const view = renderMobile(<GlassSurface blurTarget={target} className="h-11 rounded-full px-4" testID="surface"><Text>Filters</Text></GlassSurface>);
  expect(view.getByTestId("surface").props.className).toContain("shadow-floating");
  expect(view.getByTestId("surface").props.className).not.toContain("overflow-hidden");
  expect(view.getByTestId("native-blur").props.className).toBe("absolute inset-0 overflow-hidden rounded-full");
  expect(classNames(view)).toContain("border-glass-edge/glass-rim");
});
it("uses the opaque surface when Reduce Transparency is on", () => {
  settings.reduced = true;
  const view = surface();
  expect(view.queryByTestId("native-blur")).toBeNull();
  expect(view.getByText("Favorites")).toBeTruthy();
  expect(view.UNSAFE_getAllByType(View).some((node) => node.props.className?.includes("bg-card"))).toBe(true);
});
it("keeps the tuned fallback without an Android blur target", () => {
  const view = surface(false);
  expect(view.queryByTestId("native-blur")).toBeNull();
  expect(view.getByText("Favorites")).toBeTruthy();
  expect(classNames(view)).toContain("bg-glass/glass");
  expect(classNames(view)).not.toContain("bg-glass/glass-frosted");
});
