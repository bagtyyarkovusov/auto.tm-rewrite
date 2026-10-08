import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The content column stops growing here on tablets and in landscape. */
export const ONBOARDING_MAX_WIDTH = 480;
/** Below this usable height the picture gives its room to the words. */
const COMPACT_HEIGHT = 520;
/** From this system font scale the picture gives its room to the words. */
const COMPACT_FONT_SCALE = 1.3;

/**
 * Sizes for the onboarding screens
 * (docs/prd/ui/hifi/mobile-onboarding.md, "Large text, small windows").
 *
 * `compact` drops the illustration so the text can scroll between the fixed
 * top bar and the fixed button. `columnWidth` is the width of one pager page.
 */
export function useOnboardingLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const usableHeight = height - insets.top - insets.bottom;

  return {
    compact: fontScale >= COMPACT_FONT_SCALE || usableHeight < COMPACT_HEIGHT,
    columnWidth: Math.min(width - insets.left - insets.right, ONBOARDING_MAX_WIDTH),
  };
}
