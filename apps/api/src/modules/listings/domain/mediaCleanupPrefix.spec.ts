import { describe, it, expect } from "vitest";

import { mediaCleanupPrefix } from "./mediaCleanupPrefix";

const directory = "pending/00000000-0000-4000-8000-000000000001/";

describe("Listing cleanup namespace", () => {
  it.each(["jpg", "webp", "mp4"])("recognizes a presigned %s original", (extension) => {
    expect(mediaCleanupPrefix(`${directory}original.${extension}`)).toBe(directory);
  });

  it.each([
    "pending/original.jpg", "pending/not-a-uuid/original.jpg",
    `${directory}original.jpeg`, `${directory}nested/original.jpg`,
    `${directory}thumbnail.jpg`, `${directory}original.jpg/extra`,
    `other/${directory}original.jpg`, `/${directory}original.jpg`,
    "chat-attachments/conversation/00000000-0000-4000-8000-000000000001/original.mp4",
    `${directory}original.jpg\n`,
  ])("rejects keys presign cannot produce: %s", (key) => {
    expect(mediaCleanupPrefix(key)).toBeNull();
  });
});
