import { useEffect } from "react";
import { View } from "react-native";
import { beforeEach, expect, it, vi } from "vitest";

import { renderMobile } from "../render";
import { GlassSurface } from "../../components/ui/glass-surface";
import { Text } from "../../components/ui/text";

vi.mock("expo-blur", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  return { BlurView: (props: object) => React.createElement(View, { ...props, testID: "focused-blur" }), BlurTargetView: View };
});

beforeEach(() => vi.resetModules());

it("provides the focused target after its first mount and removes it on unmount", async () => {
  const { Platform } = await import("react-native");
  Object.assign(Platform, { OS: "android", Version: 31 });
  const { TabBlurTargets, TabBlurTarget, useTabBlurTarget } = await import("../../components/navigation/TabBlurTargets");
  function Bar() {
    return <GlassSurface blurTarget={useTabBlurTarget("search")}><Text>Search</Text></GlassSurface>;
  }
  function Screen({ mounted }: { mounted: boolean }) {
    return <TabBlurTargets><Bar />{mounted ? <TabBlurTarget routeKey="search"><View /></TabBlurTarget> : null}</TabBlurTargets>;
  }
  const view = renderMobile(<Screen mounted />);
  expect(view.getByTestId("focused-blur").props.blurTarget).toBeDefined();
  view.rerender(<Screen mounted={false} />);
  expect(view.queryByTestId("focused-blur")).toBeNull();
  expect(view.getByText("Search")).toBeTruthy();
});

it("keeps the bar's blur and its children mounted while a lazily mounted tab registers", async () => {
  const { Platform } = await import("react-native");
  Object.assign(Platform, { OS: "android", Version: 31 });
  const { TabBlurTargets, TabBlurTarget, useTabBlurTarget } = await import("../../components/navigation/TabBlurTargets");
  let mounts = 0;
  function Tabs() {
    useEffect(() => { mounts += 1; }, []);
    return <Text>Tabs</Text>;
  }
  function Bar({ focused }: { focused: string }) {
    return <GlassSurface blurTarget={useTabBlurTarget(focused)}><Tabs /></GlassSurface>;
  }
  // Favorites is lazy: its screen mounts, and registers, only after it is focused.
  function Screen({ focused, favoritesMounted }: { focused: string; favoritesMounted: boolean }) {
    return (
      <TabBlurTargets>
        <Bar focused={focused} />
        <TabBlurTarget routeKey="search"><View /></TabBlurTarget>
        {favoritesMounted ? <TabBlurTarget routeKey="favorites"><View /></TabBlurTarget> : null}
      </TabBlurTargets>
    );
  }
  const view = renderMobile(<Screen focused="search" favoritesMounted={false} />);
  const searchTarget = view.getByTestId("focused-blur").props.blurTarget;
  expect(searchTarget).toBeDefined();
  const mountsWithBlur = mounts;

  view.rerender(<Screen focused="favorites" favoritesMounted={false} />);
  expect(view.getByTestId("focused-blur").props.blurTarget).toBe(searchTarget);
  expect(mounts).toBe(mountsWithBlur);

  view.rerender(<Screen focused="favorites" favoritesMounted />);
  const favoritesTarget = view.getByTestId("focused-blur").props.blurTarget;
  expect(favoritesTarget).toBeDefined();
  expect(favoritesTarget).not.toBe(searchTarget);
  expect(mounts).toBe(mountsWithBlur);
  view.unmount();

  // Focusing and mounting in one commit, as the navigator does, must not remount either.
  const once = renderMobile(<Screen focused="search" favoritesMounted={false} />);
  const mountsBefore = mounts;
  once.rerender(<Screen focused="favorites" favoritesMounted />);
  expect(once.getByTestId("focused-blur").props.blurTarget).toBeDefined();
  expect(mounts).toBe(mountsBefore);
});

it.each([30, 29])("keeps Android API%s screen content without a blur target", async (version) => {
  const { Platform } = await import("react-native");
  Object.assign(Platform, { OS: "android", Version: version });
  const { TabBlurTargets, TabBlurTarget, useTabBlurTarget } = await import("../../components/navigation/TabBlurTargets");
  function Bar() {
    return <GlassSurface blurTarget={useTabBlurTarget("search")}><Text>Search</Text></GlassSurface>;
  }
  const view = renderMobile(<TabBlurTargets><TabBlurTarget routeKey="search"><Text>Photos</Text></TabBlurTarget><Bar /></TabBlurTargets>);
  expect(view.queryByTestId("focused-blur")).toBeNull();
  expect(view.getByText("Photos")).toBeTruthy();
  expect(view.getByText("Search")).toBeTruthy();
});
