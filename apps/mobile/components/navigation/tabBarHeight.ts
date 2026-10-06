import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Geometry of the floating tab bar (`AutoTmTabBar`). The bar is a pill that
 * floats over the tab screens; nothing reserves layout for it, so every tab
 * screen keeps `useTabBarSpace()` clear at its bottom (see `TabScreen`).
 */

/** The floating bar itself, in dp. Each tab is a 60 dp tall target. */
export const TAB_BAR_HEIGHT = 60;

/** The gap between the bar and the screen's side edges. */
export const TAB_BAR_SIDE_MARGIN = 12;

/** Clear space kept between the top of the bar and the content above it. */
export const TAB_BAR_TOP_GAP = 8;

/** Above this the bottom inset is a button bar, not a gesture handle. */
const BUTTON_NAVIGATION_INSET = 40;

/**
 * How far the bar floats above the screen edge.
 *
 * With a home indicator or an Android gesture handle the bar sits partly
 * inside the inset, as the system's own floating bars do. With Android
 * three-button navigation the inset is the button bar, so the bar clears it
 * whole. With no inset it keeps a margin so it still reads as floating.
 */
export function tabBarBottomOffset(bottomInset: number): number {
  if (bottomInset >= BUTTON_NAVIGATION_INSET) return bottomInset + 8;
  return Math.max(bottomInset - 8, 8);
}

/** The space from the screen's bottom edge to the clear line above the bar. */
export function tabBarSpace(bottomInset: number): number {
  return tabBarBottomOffset(bottomInset) + TAB_BAR_HEIGHT + TAB_BAR_TOP_GAP;
}

/**
 * The space a tab screen leaves at its bottom so nothing ends up under the
 * floating bar. Pad a screen's root with it, or end a scrolling list with it
 * so the list runs under the bar and its last row can still be scrolled clear.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return tabBarSpace(insets.bottom);
}
