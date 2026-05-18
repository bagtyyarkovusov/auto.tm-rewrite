import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
  moveAsync: vi.fn(),
}));

import { manipulateAsync } from "expo-image-manipulator";
import { getInfoAsync, moveAsync } from "expo-file-system/legacy";

import { compressPhoto } from "./compressor";

const mockManipulateAsync = vi.mocked(manipulateAsync);
const mockGetInfoAsync = vi.mocked(getInfoAsync);
const mockMoveAsync = vi.mocked(moveAsync);

describe("compressPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls manipulateAsync with max 2400px width and JPEG quality 0.8", async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: "file:///tmp/compressed.jpg",
      width: 1000,
      height: 800,
    });
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, uri: "", size: 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/source.jpg",
      [{ resize: { width: 2400 } }],
      { compress: 0.8, format: "jpeg" },
    );
  });

  it("re-compresses with quality 0.6 when file size > 5MB", async () => {
    mockManipulateAsync
      .mockResolvedValueOnce({
        uri: "file:///tmp/compressed.jpg",
        width: 1000,
        height: 800,
      })
      .mockResolvedValueOnce({
        uri: "file:///tmp/recompressed.jpg",
        width: 1000,
        height: 800,
      });
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, uri: "", size: 6 * 1024 * 1024, isDirectory: false, modificationTime: 0 })
      .mockResolvedValueOnce({ exists: true, uri: "", size: 3 * 1024 * 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockManipulateAsync).toHaveBeenCalledTimes(2);
    expect(mockManipulateAsync).toHaveBeenLastCalledWith(
      "file:///tmp/compressed.jpg",
      [],
      { compress: 0.6, format: "jpeg" },
    );
  });

  it("moves file to destination when different", async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: "file:///tmp/compressed.jpg",
      width: 1000,
      height: 800,
    });
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, uri: "", size: 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockMoveAsync).toHaveBeenCalledWith({
      from: "file:///tmp/compressed.jpg",
      to: "file:///tmp/dest.jpg",
    });
  });

  it("does not move file when destination matches", async () => {
    mockManipulateAsync.mockResolvedValueOnce({
      uri: "file:///tmp/dest.jpg",
      width: 1000,
      height: 800,
    });
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, uri: "", size: 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockMoveAsync).not.toHaveBeenCalled();
  });
});
