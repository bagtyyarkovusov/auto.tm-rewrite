import { describe, expect, it, vi } from "vitest";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { renderMobile, fireEvent } from "../../../test/render";
import type { StagedPhoto } from "../uploadStaging/types";

import { PhotoThumbnail } from "./PhotoThumbnail";

const props = () => ({ photo: { photoId: "photo-a", sortOrder: 0, state: "attached", retryCount: 0,
  localUri: "file:///photo-a.jpg" } satisfies StagedPhoto, index: 0, total: 2,
  onRemove: vi.fn(), onOpenActions: vi.fn(),
  onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn() });

describe("PhotoThumbnail", () => {
  it("supplies square dimensions and a cover label for the first tile", () => {
    const screen = renderMobile(<PhotoThumbnail {...props()} />);
    // The badge is for the eye; a screen reader gets "Cover" in the tile's own label.
    expect(screen.getByText("Cover", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText("Photo 1 of 2, Cover, Uploaded")).toBeTruthy();
    const tile = screen.UNSAFE_getAllByType(View).find((node) => StyleSheet.flatten(node.props.style)?.width === 111);
    expect(StyleSheet.flatten(tile?.props.style)).toMatchObject({ width: 111, height: 111 });
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: "file:///photo-a.jpg" });
  });
  it("removes the photo by its id", () => {
    const callbacks = props();
    const screen = renderMobile(<PhotoThumbnail {...callbacks} />);
    fireEvent.press(screen.getByLabelText("Remove: Photo 1 of 2"));
    expect(callbacks.onRemove).toHaveBeenCalledWith("photo-a");
  });
  it("forwards long-press, move and end coordinates", () => {
    const callbacks = props();
    const screen = renderMobile(<PhotoThumbnail {...callbacks} />);
    const drag = screen.UNSAFE_getAllByType(Pressable).find((node) => node.props.onLongPress);
    if (!drag) throw new Error("Photo drag target missing");
    fireEvent(drag, "longPress", { nativeEvent: { pageX: 20, pageY: 30 } });
    fireEvent(drag, "touchMove", { nativeEvent: { touches: [{ pageX: 40, pageY: 50 }] } });
    screen.rerender(<PhotoThumbnail {...callbacks} isDragging dragOffset={{ x: 20, y: 20 }} />);
    const tileStyle = () => StyleSheet.flatten(screen.UNSAFE_getAllByType(View)
      .find((node) => StyleSheet.flatten(node.props.style)?.width === 111)?.props.style);
    expect(tileStyle()?.transform).toEqual([{ translateX: 20 }, { translateY: 20 }, { scale: 1.04 }]);
    fireEvent(drag, "pressOut");
    screen.rerender(<PhotoThumbnail {...callbacks} isDragging={false} dragOffset={{ x: 20, y: 20 }} />);
    expect(tileStyle()?.transform).toBeUndefined();
    expect(callbacks.onDragStart).toHaveBeenCalledWith(0, 20, 30);
    expect(callbacks.onDragMove).toHaveBeenCalledWith(40, 50);
    expect(callbacks.onDragEnd).toHaveBeenCalledOnce();
  });
  it("opens the photo's actions when the tile is tapped", () => {
    const callbacks = props();
    const screen = renderMobile(<PhotoThumbnail {...callbacks} />);
    fireEvent.press(screen.getByLabelText("Photo 1 of 2, Cover, Uploaded"));
    expect(callbacks.onOpenActions).toHaveBeenCalledWith("photo-a");
  });
  it("shows a queued photo as queued, with its spinner clear of the remove button", () => {
    const callbacks = props();
    const queued = { ...callbacks.photo, state: "compressed" as const };
    const screen = renderMobile(<PhotoThumbnail {...callbacks} photo={queued} />);
    // The tile says it is waiting, as the header chip counts it, instead of looking finished.
    expect(screen.getByText("In queue", { includeHiddenElements: true })).toBeTruthy();
    const spinner = screen.UNSAFE_getByType(ActivityIndicator);
    let holder = spinner.parent;
    while (holder && !holder.props.className) holder = holder.parent;
    // Centred over the photo, not tucked into the top-right corner under ✕.
    expect(holder?.props.className).toMatch(/\binset-0\b/);
    expect(holder?.props.className).not.toMatch(/\b(?:right-1|top-1)\b/);
    // ✕ stays on top and tappable, with a 28 pt button plus 8 pt slop each side: 44 pt.
    const remove = screen.getByLabelText("Remove: Photo 1 of 2");
    expect(remove.props.className).toMatch(/\bh-7 w-7\b/);
    expect(remove.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    fireEvent.press(remove);
    expect(callbacks.onRemove).toHaveBeenCalledWith("photo-a");
  });
  it("opens the actions for a failed photo too, instead of retrying on the spot", () => {
    const callbacks = props();
    const failed = { ...callbacks.photo, state: "failed" as const, error: { code: "NETWORK_ERROR" as const, message: "Offline", retryable: true } };
    const screen = renderMobile(<PhotoThumbnail {...callbacks} photo={failed} />);
    // The overlay is for the eye and never takes the tap; the label above carries the state.
    expect(screen.getByText("Offline", { includeHiddenElements: true })).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Photo 1 of 2, Cover, Failed"));
    expect(callbacks.onOpenActions).toHaveBeenCalledWith("photo-a");
  });
});
