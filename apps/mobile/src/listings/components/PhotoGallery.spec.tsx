import { describe, expect, it } from "vitest";
import { Modal } from "react-native";
import * as RN from "react-native";

import { fireEvent, renderMobile, within } from "../../../test/render";
import { mediaFixture } from "../../../test/fixtures/listing";

import { PhotoGallery } from "./PhotoGallery";

const WINDOW_WIDTH = 390;
const scrollRequests = (RN as unknown as { scrollRequests: unknown[] })
  .scrollRequests;

function viewer(screen: ReturnType<typeof renderMobile>) {
  return within(screen.UNSAFE_getByType(Modal));
}

describe("Photo gallery and viewer", () => {
  it("opens the viewer at the photo that was tapped", () => {
    const screen = renderMobile(<PhotoGallery media={mediaFixture(3)} />);
    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();

    fireEvent.press(screen.getAllByRole("button", { name: "Photo 2 of 3" })[0]!);

    expect(viewer(screen).getByText("2 / 3")).toBeTruthy();
    expect(
      viewer(screen).getByRole("button", { name: "Photo 2 of 3", selected: true }),
    ).toBeTruthy();
  });

  it("returns the gallery to the photo the viewer was closed on", () => {
    const screen = renderMobile(<PhotoGallery media={mediaFixture(3)} />);
    fireEvent.press(screen.getAllByRole("button", { name: "Photo 1 of 3" })[0]!);

    fireEvent.press(viewer(screen).getByRole("button", { name: "Photo 3 of 3" }));
    fireEvent.press(viewer(screen).getByRole("button", { name: "Close" }));

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(scrollRequests).toContainEqual(
      expect.objectContaining({
        method: "scrollToOffset",
        offset: WINDOW_WIDTH * 2,
        animated: false,
      }),
    );
  });

  it("passes the viewer's ♡ and contact actions through, closing it first when asked", () => {
    const screen = renderMobile(
      <PhotoGallery
        media={mediaFixture(2)}
        viewerFooter={(close) => (
          <RN.Pressable
            accessibilityRole="button"
            accessibilityLabel="Message"
            onPress={close}
          />
        )}
      />,
    );
    fireEvent.press(screen.getAllByRole("button", { name: "Photo 1 of 2" })[0]!);

    fireEvent.press(viewer(screen).getByRole("button", { name: "Message" }));

    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
  });

  it("has no viewer to open for a Listing without photos", () => {
    const screen = renderMobile(<PhotoGallery media={[]} />);

    expect(screen.getByText("No photos")).toBeTruthy();
    expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
  });
});
