import { AccessibilityInfo, StyleSheet } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "@/components/ui/toast";
import { renderMobile, act, fireEvent } from "@/test/render";

let toast: ReturnType<typeof useToast>;
function Capture() {
  toast = useToast();
  return null;
}
function renderToasts() {
  return renderMobile(<ToastProvider><Capture /></ToastProvider>);
}

afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("runs its action and closes when the action is pressed", () => {
    const onUndo = vi.fn();
    const view = renderToasts();
    act(() => { toast.show({ title: "Removed from Favorites", action: { label: "Undo", onPress: onUndo } }); });
    fireEvent.press(view.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledOnce();
    expect(view.queryByText("Removed from Favorites")).toBeNull();
  });

  it("gives the action a target of at least 44 pt", () => {
    const view = renderToasts();
    act(() => { toast.show({ title: "Removed", action: { label: "Undo", onPress: vi.fn() } }); });
    expect(view.getByRole("button", { name: "Undo" }).props.className).toMatch(/min-h-11/);
  });

  it("leaves the action reachable by a screen reader and announces the toast", () => {
    const announcements = (AccessibilityInfo as unknown as { announcements: string[] }).announcements;
    announcements.length = 0;
    const view = renderToasts();
    act(() => { toast.show({ title: "Removed from Favorites", action: { label: "Undo", onPress: vi.fn() } }); });
    // An accessible ancestor groups its children into one element on iOS, hiding Undo.
    let ancestor = view.getByRole("button", { name: "Undo" }).parent;
    while (ancestor) {
      expect(ancestor.props.accessible).not.toBe(true);
      ancestor = ancestor.parent;
    }
    expect(announcements).toContain("Removed from Favorites");
  });

  it("sits above the tab bar when asked, and at the top otherwise", () => {
    const view = renderToasts();
    act(() => { toast.show({ title: "Above the tab bar", placement: "aboveTabBar" }); });
    act(() => { toast.show({ title: "At the top" }); });
    const bottom = view.getByTestId("toast-viewport-above-tab-bar");
    expect(StyleSheet.flatten(bottom.props.style).bottom).toBe(72);
    expect(view.getByTestId("toast-viewport-top")).toBeTruthy();
  });

  it("closes each toast after its own duration", () => {
    vi.useFakeTimers();
    const view = renderToasts();
    act(() => { toast.show({ title: "First", duration: 1000 }); });
    act(() => { vi.advanceTimersByTime(500); });
    act(() => { toast.show({ title: "Second", duration: 1000 }); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(view.queryByText("First")).toBeNull();
    expect(view.getByText("Second")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(500); });
    expect(view.queryByText("Second")).toBeNull();
  });
});
