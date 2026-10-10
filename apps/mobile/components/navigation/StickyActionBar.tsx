import { useCallback, useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScrollEdgeFade } from "./ScrollEdgeFade";
import {
  TAB_BAR_SIDE_MARGIN,
  stickyBarBottomOffset,
  stickyBarSpace,
  type StickyBarContainer,
} from "./tabBarHeight";

import { cn } from "@/lib/utils";

/**
 * Pairs a scrolling view with the sticky action bar over it. Spread `barProps`
 * on the `StickyActionBar` and end the scrolling content with `space` of
 * padding: the content then runs under the bar, and its last row can still be
 * scrolled clear of it. `space` follows the bar's real height, so a bar that
 * gains a hint or a second button never covers the end of the list.
 */
export function useStickyActionBar(container: StickyBarContainer = "inset") {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);

  return {
    barProps: { container, onLayout },
    space: stickyBarSpace(height, insets.bottom, container),
  };
}

type StickyActionBarProps = ViewProps & {
  /** What the bar's parent already keeps clear. See `StickyBarContainer`. */
  container?: StickyBarContainer;
  /**
   * Draws the soft edge under the bar, where the scrolling content fades into
   * the page tone instead of ending in a hard line below the bar. For a bar
   * over content on the page surface; leave it off inside a sheet.
   */
  edgeFade?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * The primary action of a screen, pinned above its scrolling content with a
 * margin on every side. Content scrolls under it. The bar draws no material of
 * its own: its buttons are `GlassButton`s, each its own glass capsule, so a
 * floating action never sits as a pill inside a pill (#808).
 *
 * It is absolute at the bottom of its parent, so the parent decides what it
 * floats over. Inside a keyboard-avoiding view the parent shrinks with the
 * keyboard and the bar rides up with it; no keyboard code lives here.
 *
 * A hint or error line inside the bar reads over the soft `edgeFade`, so a bar
 * that can show one sets it.
 */
export function StickyActionBar({
  container = "inset",
  edgeFade = false,
  className,
  style,
  children,
  onLayout,
  ...props
}: StickyActionBarProps) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const measure = useCallback(
    (event: LayoutChangeEvent) => {
      setHeight(Math.ceil(event.nativeEvent.layout.height));
      onLayout?.(event);
    },
    [onLayout],
  );
  // A parent that reaches the screen's edges has not applied the side insets.
  const sideInset = container === "screen" ? Math.max(insets.left, insets.right) : 0;

  return (
    <>
      {edgeFade && height > 0 ? (
        <ScrollEdgeFade height={stickyBarSpace(height, insets.bottom, container)} />
      ) : null}
      <View
      pointerEvents="box-none"
      onLayout={measure}
      style={[
        {
          position: "absolute",
          left: TAB_BAR_SIDE_MARGIN + sideInset,
          right: TAB_BAR_SIDE_MARGIN + sideInset,
          bottom: stickyBarBottomOffset(insets.bottom, container),
        },
        style,
      ]}
      {...props}
    >
      <View className={cn("gap-2", className)}>
        {children}
      </View>
      </View>
    </>
  );
}
