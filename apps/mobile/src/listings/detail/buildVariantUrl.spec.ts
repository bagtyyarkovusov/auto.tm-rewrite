import { describe, it, expect } from "vitest";

process.env["EXPO_PUBLIC_MEDIA_URL"] = "https://media.autotm.tm";

import { buildVariantUrl } from "./buildVariantUrl";

describe("buildVariantUrl", () => {
  it("builds detail variant from original key", () => {
    const url = buildVariantUrl("listings/l1/m1/original.jpg", "detail");
    expect(url).toBe("https://media.autotm.tm/listings/l1/m1/detail.jpg");
  });

  it("builds fullscreen variant from webp original", () => {
    const url = buildVariantUrl(
      "listings/l1/m1/original.webp",
      "fullscreen",
    );
    expect(url).toBe("https://media.autotm.tm/listings/l1/m1/fullscreen.jpg");
  });

  it("returns raw URL for video keys", () => {
    const url = buildVariantUrl("listings/l1/m1/video.mp4", "detail");
    expect(url).toBe("https://media.autotm.tm/listings/l1/m1/video.mp4");
  });
});
