import { describe, expect, it } from "vitest";

process.env["EXPO_PUBLIC_MEDIA_URL"] = "https://media.autotm.tm";

import { getPhotoUri } from "./photoUri";
import type { StagedPhoto } from "./types";

function photo(overrides: Partial<StagedPhoto>): StagedPhoto {
  return {
    photoId: "photo-1",
    state: "uploaded",
    sortOrder: 0,
    retryCount: 0,
    ...overrides,
  };
}

describe("getPhotoUri", () => {
  it("prefers the local staged file when it exists", () => {
    expect(
      getPhotoUri(
        photo({
          localUri: "file:///local/photo.jpg",
          key: "pending/p1/original.jpg",
        }),
      ),
    ).toBe("file:///local/photo.jpg");
  });

  it("uses the pending original object because draft uploads have no generated variants yet", () => {
    expect(getPhotoUri(photo({ key: "pending/p1/original.jpg" }))).toBe(
      "https://media.autotm.tm/listing-photos/pending/p1/original.jpg",
    );
  });

  it("uses generated variants for attached listing media", () => {
    expect(
      getPhotoUri(
        photo({ key: "listings/listing-1/media-1/original.jpg" }),
        "detail",
      ),
    ).toBe(
      "https://media.autotm.tm/listing-photos/listings/listing-1/media-1/detail.jpg",
    );
  });
});
