import { Platform, View } from "react-native";
import { expect, it, vi } from "vitest";

import { renderMobile } from "../render";
import { GlassSurface } from "../../components/ui/glass-surface";
import { Text } from "../../components/ui/text";

vi.mock("expo-blur", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  return { BlurView: (props: object) => React.createElement(View, { ...props, testID: "focused-blur" }), BlurTargetView: View };
});

it("provides the focused target after its first mount and removes it on unmount", async () => {
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
