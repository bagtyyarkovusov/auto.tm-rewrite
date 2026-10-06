import type { ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTabBarSpace } from "./tabBarHeight";

import { cn } from "@/lib/utils";

type TabScreenProps = ViewProps & {
  className?: string;
  /**
   * Lets the content run under the floating tab bar. The screen's scrolling
   * list then ends with `useTabBarSpace()` of padding itself, so its last row
   * can be scrolled clear of the bar. Without it the screen stops above the
   * bar, which is right for a screen with a button pinned to its bottom.
   */
  underTabBar?: boolean;
};

/**
 * The root of a screen inside the tabs. It keeps the top and side safe areas
 * and the space the floating tab bar needs, on the page surface.
 */
export function TabScreen({
  underTabBar = false,
  className,
  style,
  ...props
}: TabScreenProps) {
  const space = useTabBarSpace();
  return (
    <SafeAreaView
      className={cn("flex-1 bg-background", className)}
      edges={["top", "left", "right"]}
      style={[underTabBar ? null : { paddingBottom: space }, style]}
      {...props}
    />
  );
}
