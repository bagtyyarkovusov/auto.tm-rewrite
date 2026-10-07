import { mobileSurfaces } from "@auto-tm/ui/tokens";
import { useColorScheme } from "nativewind";
import { View } from "react-native";

/** How far above a floating bar the content starts to fade, in dp. */
const FADE_LEAD = 28;

/** The page tone at `alpha`, from the surface token ("h s% l%"). */
function pageTone(scheme: "light" | "dark", alpha: number): string {
  const [hue, saturation, lightness] = mobileSurfaces.page[scheme].split(" ");
  return `hsla(${hue}, ${saturation}, ${lightness}, ${alpha})`;
}

/**
 * The soft edge under a floating bar. Content that scrolls beneath the bar
 * fades into the page tone instead of showing through and below it, so the
 * bar's labels never sit on a line of list text. It is decoration only: it
 * takes no touches and is hidden from assistive technology.
 *
 * It is drawn by the screen, over its scrolling content and under whatever
 * the screen floats (`TabScreen` for the tab bar, `StickyActionBar` for a
 * pinned action). A floating control must sit above it in the tree, or the
 * fade washes over the control too.
 *
 * `height` is the space the bar keeps clear, from the bottom edge of the
 * parent up to the bar's clear line; the fade starts a little above that.
 *
 * The gradient is the platform's own (`experimental_backgroundImage`, drawn
 * by the native view on Android and iOS), so it costs one view and no
 * drawing library.
 */
export function ScrollEdgeFade({ height }: { height: number }) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const total = height + FADE_LEAD;
  // Nearly opaque a quarter of the way past the lead, opaque at the bottom.
  const settle = Math.round((FADE_LEAD / total + 0.25) * 100);
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
        experimental_backgroundImage: `linear-gradient(to bottom, ${pageTone(scheme, 0)} 0%, ${pageTone(scheme, 0.94)} ${settle}%, ${pageTone(scheme, 1)} 100%)`,
      }}
    />
  );
}
