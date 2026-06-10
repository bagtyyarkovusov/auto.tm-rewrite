import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

/**
 * Reliable safe-area wrapper for stack screens.
 *
 * SafeAreaView from react-native-safe-area-context is known to fail on
 * top-edge insets inside native-stack navigators with headerShown: false
 * (react-navigation/react-navigation#12816, #12893).  We use
 * useSafeAreaInsets directly and apply them to a plain View so every
 * screen gets correct insets regardless of navigator state.
 *
 * ⚠️ IMPORTANT — Absolute positioning and SafeScreen:
 * In React Native Yoga, `position: 'absolute'` with `top`/`bottom` is
 * positioned relative to the parent's *border box*, ignoring padding.
 * Since SafeScreen applies insets as *padding*, an absolutely positioned
 * child with `top: 8` will be at 8px from the SCREEN edge, NOT from the
 * safe-area edge.  This means floating buttons placed with `absolute`
 * inside SafeScreen will overlap the status bar / Dynamic Island.
 *
 * For screens with absolute floating elements (e.g. a back button over
 * a full-bleed hero photo), do NOT wrap the floating element in
 * SafeScreen.  Instead:
 *   1. Use `useSafeAreaInsets()` directly in the screen component.
 *   2. Apply the inset explicitly: `style={{ top: insets.top + 8 }}`.
 *   3. Apply safe-area padding only to scrollable/normal-flow content.
 *
 * HIG alignment:
 * - Top inset keeps content below the status bar / Dynamic Island.
 * - Bottom inset keeps content above the home indicator.
 * - Horizontal insets respect device edges.
 */
export function SafeScreen({
  children,
  className,
  ...props
}: ViewProps & { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn("flex-1 bg-background", className)}
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      {...props}
    >
      {children}
    </View>
  );
}
