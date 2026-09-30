import { describe, expect, it, vi } from "vitest";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { renderMobile, fireEvent } from "../../../test/render";
import type { StagedPhoto } from "../uploadStaging/types";

import { PhotoThumbnail } from "./PhotoThumbnail";

const props = () => ({ photo: { photoId: "photo-a", sortOrder: 0, state: "attached", retryCount: 0,
  localUri: "file:///photo-a.jpg" } satisfies StagedPhoto, index: 0, total: 2,
  onRetry: vi.fn(), onRemove: vi.fn(), onMoveUp: vi.fn(), onMoveDown: vi.fn(),
  onSetAsCover: vi.fn(), onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn() });

describe("PhotoThumbnail", () => {
  it("supplies square dimensions and a cover label for the first tile", () => {
    const screen = renderMobile(<PhotoThumbnail {...props()} />);
    expect(screen.getByText("Cover")).toBeTruthy();
    const tile = screen.UNSAFE_getAllByType(View).find((node) => StyleSheet.flatten(node.props.style)?.width === 111);
    expect(StyleSheet.flatten(tile?.props.style)).toMatchObject({ width: 111, height: 111 });
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: "file:///photo-a.jpg" });
  });
  it("removes the photo by its id", () => {
    const callbacks = props();
    const screen = renderMobile(<PhotoThumbnail {...callbacks} />);
    fireEvent.press(screen.getByLabelText("Remove"));
    expect(callbacks.onRemove).toHaveBeenCalledWith("photo-a");
  });
  it("forwards long-press, move and end coordinates", () => {
    const callbacks = props();
    const screen = renderMobile(<PhotoThumbnail {...callbacks} />);
    const drag = screen.UNSAFE_getAllByType(Pressable).find((node) => node.props.onLongPress);
    if (!drag) throw new Error("Photo drag target missing");
    fireEvent(drag, "longPress", { nativeEvent: { pageX: 20, pageY: 30 } });
    fireEvent(drag, "touchMove", { nativeEvent: { touches: [{ pageX: 40, pageY: 50 }] } });
    fireEvent(drag, "pressOut");
    expect(callbacks.onDragStart).toHaveBeenCalledWith(0, 20, 30);
    expect(callbacks.onDragMove).toHaveBeenCalledWith(40, 50);
    expect(callbacks.onDragEnd).toHaveBeenCalledOnce();
  });
  it("offers retry only for retryable failed uploads", () => {
    const callbacks = props();
    const screen = renderMobile(<PhotoThumbnail {...callbacks} photo={{ ...callbacks.photo, state: "failed", error: { code: "NETWORK_ERROR", message: "Offline", retryable: true } }} />);
    fireEvent.press(screen.getByText("Retry"));
    expect(callbacks.onRetry).toHaveBeenCalledWith("photo-a");
  });
});
