import { describe, expect, it, vi } from "vitest";
import { Pressable } from "react-native";

import { fireEvent, renderMobile, first } from "../../../test/render";
import { mediaFixture } from "../../../test/fixtures/listing";

import { PhotoViewer } from "./PhotoViewer";

// The real ZoomableImage runs pinch, pan and double-tap on the UI thread, which
// needs a device. This stand-in lets the viewer's own response to a zoom
// change (paging lock, and snapping neighbours back) be tested here.
vi.mock("./ZoomableImage", () => ({
  ZoomableImage: ({
    active,
    onZoomChange,
    children,
  }: {
    active: boolean;
    onZoomChange: (zoomed: boolean) => void;
    children: React.ReactNode;
  }) => (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active ? "Zoom in active photo" : "Zoom in other photo"}
        onPress={() => onZoomChange(true)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
        onPress={() => onZoomChange(false)}
      />
      {children}
    </>
  ),
}));

function open() {
  return renderMobile(
    <PhotoViewer visible media={mediaFixture(3)} initialIndex={0} onClose={vi.fn()} />,
  );
}

describe("Photo viewer while a photo is zoomed", () => {
  it("pages between photos only while the photo is fitted", () => {
    const screen = open();
    const pager = () => screen.getByTestId("photo-viewer-pager");

    expect(pager().props.scrollEnabled).toBe(true);

    fireEvent.press(screen.getByRole("button", { name: "Zoom in active photo" }));
    expect(pager().props.scrollEnabled).toBe(false);

    fireEvent.press(first(screen.getAllByRole("button", { name: "Zoom out" })));
    expect(pager().props.scrollEnabled).toBe(true);
  });

  it("tells only the photo being viewed that it is the active one", () => {
    const screen = open();

    expect(screen.getAllByRole("button", { name: "Zoom in active photo" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Zoom in other photo" })).toHaveLength(2);
  });
});
