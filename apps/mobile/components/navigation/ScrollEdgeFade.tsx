import { useColorScheme } from "nativewind";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { THEME } from "@/lib/theme";

/** How far above a floating bar the content starts to fade, in dp. */
const FADE_LEAD = 28;

/**
 * The soft edge under a floating bar. Content that scrolls beneath the bar
 * fades into the page tone instead of showing through and below it, so the
 * bar's labels never sit on a line of list text. It is decoration only: it
 * takes no touches and is hidden from assistive technology.
 */
export function ScrollEdgeFade({ height }: { height: number }) {
  const { colorScheme } = useColorScheme();
  const page = `hsl(${THEME[colorScheme === "dark" ? "dark" : "light"].background})`;
  const total = height + FADE_LEAD;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: total,
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="scroll-edge-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={page} stopOpacity={0} />
            <Stop
              offset={FADE_LEAD / total + 0.25}
              stopColor={page}
              stopOpacity={0.94}
            />
            <Stop offset="1" stopColor={page} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#scroll-edge-fade)" />
      </Svg>
    </View>
  );
}
