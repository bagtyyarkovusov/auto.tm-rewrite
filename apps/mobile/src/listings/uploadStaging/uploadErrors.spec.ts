import { describe, it, expect, vi } from "vitest";

vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: vi.fn(),
  },
}));

vi.mock("expo-file-system/legacy", () => ({
  getInfoAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  deleteAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  moveAsync: vi.fn(),
  uploadAsync: vi.fn(),
  FileSystemUploadType: { BINARY_CONTENT: "BINARY_CONTENT" },
  documentDirectory: "file:///doc/",
}));

vi.mock("../../auth/session", () => ({
  loadAuthSession: vi.fn().mockResolvedValue(null),
  storeAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
}));

import { ApiError } from "../../api/client";

import { buildUploadError } from "./uploadErrors";
import { CompressionError } from "./compressor";

describe("buildUploadError", () => {
  it("maps CompressionError to LOCAL_FILE_MISSING (non-retryable)", () => {
    const error = buildUploadError(new CompressionError("Photo file missing", "SOURCE_MISSING"));
    expect(error.code).toBe("LOCAL_FILE_MISSING");
    expect(error.retryable).toBe(false);
    expect(error.message).toBe("Photo file missing");
  });

  it("maps ApiError with status 429 to RATE_LIMITED (retryable)", () => {
    const error = buildUploadError(new ApiError("RATE_LIMITED", 429, "Too many requests"));
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("Too many uploads — please retry in a moment");
  });

  it("maps ApiError without 429 to PRESIGN_FAILED (retryable)", () => {
    const error = buildUploadError(new ApiError("SERVER_ERROR", 500, "Internal error"));
    expect(error.code).toBe("PRESIGN_FAILED");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("Server error getting upload URL — please retry");
  });

  it("maps TypeError to NETWORK_ERROR (retryable)", () => {
    const error = buildUploadError(new TypeError("Network request failed"));
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("No internet connection — will retry automatically");
  });

  it("maps network-related message to NETWORK_ERROR (retryable)", () => {
    const error = buildUploadError(new Error("No network connection"));
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.retryable).toBe(true);
  });

  it("maps PUT failed message to PUT_FAILED (retryable)", () => {
    const error = buildUploadError(new Error("PUT failed: 403"));
    expect(error.code).toBe("PUT_FAILED");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("Upload server error — please retry");
  });

  it("maps unknown errors to UNKNOWN (retryable)", () => {
    const error = buildUploadError(new Error("Something weird"));
    expect(error.code).toBe("UNKNOWN");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("Something weird");
  });

  it("maps non-Error values to UNKNOWN (retryable)", () => {
    const error = buildUploadError("plain string");
    expect(error.code).toBe("UNKNOWN");
    expect(error.retryable).toBe(true);
    expect(error.message).toBe("Upload failed");
  });
});
