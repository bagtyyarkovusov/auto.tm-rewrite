import { BlurTargetView } from "expo-blur";
import { useRef, type ReactNode } from "react";
import { Platform, type View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScrollEdgeFade } from "./ScrollEdgeFade";
import { ANDROID_BLUR } from "./TabBlurTargets";
import { useTabBarSpace } from "./tabBarHeight";

import { GlassBackdrop, useSystemGlass } from "@/components/ui/glass-surface";
import { useReduceTransparency } from "@/lib/motion";
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
  /**
   * Draws the soft edge above the tab bar, where scrolling content fades
   * into the page. Turn it off on a screen that pins its own bar there
   * (`StickyActionBar` brings its own fade, drawn under the bar).
   */
  edgeFade?: boolean;
  /**
   * Controls that float over the scrolling content just above the tab bar,
   * such as the Results filter chips. They are drawn above the edge fade.
   */
  overlay?: ReactNode;
};

/**
 * The root of a screen inside the tabs. It keeps the top and side safe areas
 * and the space the floating tab bar needs, on the page surface.
 */
export function TabScreen({
  underTabBar = false,
  edgeFade = true,
  overlay,
  className,
  style,
  children,
  ...props
}: TabScreenProps) {
  const space = useTabBarSpace();
  const reduceTransparency = useReduceTransparency();
  const systemGlass = useSystemGlass();
  const backdrop = useRef<View | null>(null);
  // Where the tab bar blurs what is behind it, the content shows through the
  // glass, as it should. The fade is for a bar with nothing but its tone
  // between a label and a line of list text.
  const barBlurs = systemGlass || (!reduceTransparency && (Platform.OS === "ios" || ANDROID_BLUR));
  const content = (
    <>
      {children}
      {edgeFade && !barBlurs ? <ScrollEdgeFade height={space} /> : null}
    </>
  );
  return (
    <SafeAreaView
      className={cn("flex-1 bg-background", className)}
      edges={["top", "left", "right"]}
      style={[underTabBar ? null : { paddingBottom: space }, style]}
      {...props}
    >
      {/* Android blurs a named view. The overlay floats outside the content,
          so its glass can blur the content; `overlay` is null, never
          undefined, while a screen that floats controls has none showing, so
          the content is not mounted again when they appear. */}
      {ANDROID_BLUR && overlay !== undefined ? (
        <>
          <BlurTargetView ref={backdrop} className="flex-1">{content}</BlurTargetView>
          <GlassBackdrop.Provider value={backdrop}>{overlay}</GlassBackdrop.Provider>
        </>
      ) : (
        <>
          {content}
          {overlay}
        </>
      )}
    </SafeAreaView>
  );
}
