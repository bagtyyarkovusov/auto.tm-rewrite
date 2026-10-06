import { mobileControl } from "@auto-tm/ui/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Geometry of the floating chrome: the tab bar (`AutoTmTabBar`) and the
 * sticky action bar (`StickyActionBar`). Both float over the screen; nothing
 * reserves layout for them, so a screen keeps the space they report clear at
 * its bottom (see `TabScreen` and `useStickyActionBar`).
 */

/** The floating tab bar itself, in dp. Each tab is a target this tall. */
export const TAB_BAR_HEIGHT = mobileControl.tabBar;

/** The gap between a floating bar and the screen's side edges. */
export const TAB_BAR_SIDE_MARGIN = 12;

/** Clear space kept between the top of a floating bar and what is above it. */
export const TAB_BAR_TOP_GAP = 8;

/** Inner padding between the tab bar's edge and its first and last tab. */
export const TAB_BAR_PADDING = 4;

/**
 * Where a tab's icon row starts, from the top of the bar. The 32 dp icon row,
 * a 4 dp gap and the 14 dp label make 50 dp, centred in the 64 dp bar.
 */
export const TAB_CONTENT_TOP = 7;

/** The least room a floating bar keeps from the edge below it. */
export const FLOATING_BAR_MARGIN = 8;

/**
 * At or above this the bottom inset is a button bar, not a gesture handle.
 * Android three-button navigation reports about 48 dp; a gesture handle about
 * 16 to 24 dp; the iPhone home indicator 34 pt, which is a handle.
 */
const BUTTON_NAVIGATION_INSET = 40;

/**
 * How far a floating bar sits above the screen's bottom edge.
 *
 * With a home indicator or an Android gesture handle the bar sits partly
 * inside the inset, as the system's own floating bars do. With Android
 * three-button navigation the inset is the button bar, so the bar clears it
 * whole. With no inset it keeps a margin so it still reads as floating.
 */
export function tabBarBottomOffset(bottomInset: number): number {
  if (bottomInset >= BUTTON_NAVIGATION_INSET) return bottomInset + FLOATING_BAR_MARGIN;
  return Math.max(bottomInset - FLOATING_BAR_MARGIN, FLOATING_BAR_MARGIN);
}

/** The space from the screen's bottom edge to the clear line above the bar. */
export function tabBarSpace(bottomInset: number): number {
  return tabBarBottomOffset(bottomInset) + TAB_BAR_HEIGHT + TAB_BAR_TOP_GAP;
}

/**
 * The width of one tab's slot. The five slots share the bar's inner width
 * evenly, so the selected capsule and every label know how much room they
 * have. Zero until the bar has been measured.
 */
export function tabSlotWidth(barWidth: number, tabCount: number): number {
  if (barWidth <= 0 || tabCount <= 0) return 0;
  return Math.max((barWidth - TAB_BAR_PADDING * 2) / tabCount, 0);
}

/**
 * What the sticky action bar's parent already keeps clear:
 *  - `screen`: nothing. The parent reaches the screen's bottom edge, so the
 *    bar clears the system inset itself, at the tab bar's own level.
 *  - `inset`: the system inset, the tab bar or the keyboard. The parent ends
 *    above it (a `SafeScreen`, a `TabScreen`, a keyboard-avoiding view, a
 *    sheet), so the bar only keeps its floating margin.
 */
export type StickyBarContainer = "screen" | "inset";

/** How far the sticky action bar sits above the bottom edge of its parent. */
export function stickyBarBottomOffset(
  bottomInset: number,
  container: StickyBarContainer,
): number {
  return container === "screen" ? tabBarBottomOffset(bottomInset) : FLOATING_BAR_MARGIN;
}

/**
 * The space scrolling content leaves at its end so its last row can be
 * scrolled clear of a sticky action bar of `barHeight`.
 */
export function stickyBarSpace(
  barHeight: number,
  bottomInset: number,
  container: StickyBarContainer,
): number {
  if (barHeight <= 0) return 0;
  return stickyBarBottomOffset(bottomInset, container) + barHeight + TAB_BAR_TOP_GAP;
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
