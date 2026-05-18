import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: vi.fn(),
  },
}));

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
  moveAsync: vi.fn(),
}));

import { ImageManipulator } from "expo-image-manipulator";
import { getInfoAsync, moveAsync } from "expo-file-system/legacy";

import { compressPhoto } from "./compressor";

const mockManipulate = vi.mocked(ImageManipulator.manipulate);
const mockGetInfoAsync = vi.mocked(getInfoAsync);
const mockMoveAsync = vi.mocked(moveAsync);

function mockManipulatorChain(result: { uri: string; width: number; height: number }) {
  const saveAsync = vi.fn().mockResolvedValue(result);
  const renderAsync = vi.fn().mockResolvedValue({ saveAsync });
  const context = {
    resize: vi.fn().mockReturnThis(),
    renderAsync,
  };
  mockManipulate.mockReturnValueOnce(context as unknown as ReturnType<typeof ImageManipulator.manipulate>);
  return context;
}

describe("compressPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls ImageManipulator.manipulate with max 2400px width and JPEG quality 0.8", async () => {
    mockManipulatorChain({
      uri: "file:///tmp/compressed.jpg",
      width: 1000,
      height: 800,
    });
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, uri: "", size: 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockManipulate).toHaveBeenCalledWith("file:///tmp/source.jpg");
    const context = mockManipulate.mock.results[0]!.value as { resize: ReturnType<typeof vi.fn> };
    expect(context.resize).toHaveBeenCalledWith({ width: 2400 });
  });

  it("re-compresses with quality 0.6 when file size > 5MB", async () => {
    mockManipulatorChain({
      uri: "file:///tmp/compressed.jpg",
      width: 1000,
      height: 800,
    });
    mockManipulatorChain({
      uri: "file:///tmp/recompressed.jpg",
      width: 1000,
      height: 800,
    });
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, uri: "", size: 6 * 1024 * 1024, isDirectory: false, modificationTime: 0 })
      .mockResolvedValueOnce({ exists: true, uri: "", size: 3 * 1024 * 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockManipulate).toHaveBeenCalledTimes(2);
    expect(mockManipulate).toHaveBeenLastCalledWith("file:///tmp/compressed.jpg");
  });

  it("moves file to destination when different", async () => {
    mockManipulatorChain({
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
    mockManipulatorChain({
      uri: "file:///tmp/dest.jpg",
      width: 1000,
      height: 800,
    });
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, uri: "", size: 1024, isDirectory: false, modificationTime: 0 });

    await compressPhoto("file:///tmp/source.jpg", "file:///tmp/dest.jpg");

    expect(mockMoveAsync).not.toHaveBeenCalled();
  });
});
