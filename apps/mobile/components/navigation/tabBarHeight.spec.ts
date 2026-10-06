import { describe, expect, it, vi } from "vitest";

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

import {
  FLOATING_BAR_MARGIN,
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING,
  TAB_BAR_TOP_GAP,
  stickyBarBottomOffset,
  stickyBarSpace,
  tabBarBottomOffset,
  tabBarSpace,
  tabSlotWidth,
} from "./tabBarHeight";

// The bottom insets the bar meets in the field.
const NO_INSET = 0;
const ANDROID_GESTURE = 24;
const IPHONE_HOME_INDICATOR = 34;
const ANDROID_THREE_BUTTON = 48;

describe("tabBarBottomOffset", () => {
  it("keeps a floating margin when the screen has no bottom inset", () => {
    expect(tabBarBottomOffset(NO_INSET)).toBe(FLOATING_BAR_MARGIN);
  });

  it("sits partly inside a gesture handle's inset, never below the margin", () => {
    expect(tabBarBottomOffset(ANDROID_GESTURE)).toBe(16);
    expect(tabBarBottomOffset(IPHONE_HOME_INDICATOR)).toBe(26);
    expect(tabBarBottomOffset(12)).toBe(FLOATING_BAR_MARGIN);
  });

  it("clears Android three-button navigation whole, with the margin above it", () => {
    expect(tabBarBottomOffset(ANDROID_THREE_BUTTON)).toBe(ANDROID_THREE_BUTTON + FLOATING_BAR_MARGIN);
    expect(tabBarBottomOffset(40)).toBe(48);
  });

  it("never puts the bar over the system buttons or off the screen", () => {
    for (let inset = 0; inset <= 64; inset += 1) {
      const offset = tabBarBottomOffset(inset);
      expect(offset).toBeGreaterThanOrEqual(FLOATING_BAR_MARGIN);
      if (inset >= 40) expect(offset).toBeGreaterThan(inset);
    }
  });
});

describe("tabBarSpace", () => {
  it("is the offset, the bar and the gap above it", () => {
    for (const inset of [NO_INSET, ANDROID_GESTURE, IPHONE_HOME_INDICATOR, ANDROID_THREE_BUTTON]) {
      expect(tabBarSpace(inset)).toBe(tabBarBottomOffset(inset) + TAB_BAR_HEIGHT + TAB_BAR_TOP_GAP);
    }
  });
});

describe("tabSlotWidth", () => {
  it("shares the bar's inner width evenly between the tabs", () => {
    // iPhone 17: 402 pt wide, 12 pt margins.
    expect(tabSlotWidth(378, 5)).toBe((378 - TAB_BAR_PADDING * 2) / 5);
    // A 360 dp Android phone still gives each tab a 48 dp target.
    expect(tabSlotWidth(336, 5)).toBeGreaterThanOrEqual(48);
  });

  it("is zero until the bar has been measured", () => {
    expect(tabSlotWidth(0, 5)).toBe(0);
    expect(tabSlotWidth(378, 0)).toBe(0);
  });
});

describe("stickyBarBottomOffset", () => {
  it("floats at the tab bar's level when its parent reaches the screen's edge", () => {
    for (const inset of [NO_INSET, ANDROID_GESTURE, IPHONE_HOME_INDICATOR, ANDROID_THREE_BUTTON]) {
      expect(stickyBarBottomOffset(inset, "screen")).toBe(tabBarBottomOffset(inset));
    }
  });

  it("keeps only the margin when its parent already clears the inset, the tab bar or the keyboard", () => {
    for (const inset of [NO_INSET, ANDROID_GESTURE, IPHONE_HOME_INDICATOR, ANDROID_THREE_BUTTON]) {
      expect(stickyBarBottomOffset(inset, "inset")).toBe(FLOATING_BAR_MARGIN);
    }
  });
});

describe("stickyBarSpace", () => {
  it("lets the last row scroll clear of the bar", () => {
    expect(stickyBarSpace(72, IPHONE_HOME_INDICATOR, "screen")).toBe(26 + 72 + TAB_BAR_TOP_GAP);
    expect(stickyBarSpace(72, ANDROID_THREE_BUTTON, "screen")).toBe(56 + 72 + TAB_BAR_TOP_GAP);
    expect(stickyBarSpace(72, ANDROID_THREE_BUTTON, "inset")).toBe(FLOATING_BAR_MARGIN + 72 + TAB_BAR_TOP_GAP);
  });

  it("reserves nothing before the bar has been measured", () => {
    expect(stickyBarSpace(0, IPHONE_HOME_INDICATOR, "screen")).toBe(0);
  });
});
