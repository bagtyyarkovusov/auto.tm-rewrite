import { ApiError } from "../../api/client";

import { CompressionError } from "./compressor";
import type { UploadError } from "./types";

export function buildUploadError(err: unknown): UploadError {
  if (err instanceof CompressionError) {
    return {
      code: "LOCAL_FILE_MISSING",
      message: err.message,
      retryable: false,
    };
  }

  if (err instanceof ApiError) {
    if (err.status === 429) {
      return {
        code: "RATE_LIMITED",
        message: "Too many uploads — please retry in a moment",
        retryable: true,
      };
    }
    return {
      code: "PRESIGN_FAILED",
      message: "Server error getting upload URL — please retry",
      retryable: true,
    };
  }

  const message = err instanceof Error ? err.message : "Upload failed";

  // Network errors from fetch / expo-file-system typically contain "network" or are TypeErrors
  if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("fetch") ||
    message.toLowerCase().includes("internet") ||
    err instanceof TypeError
  ) {
    return {
      code: "NETWORK_ERROR",
      message: "No internet connection — will retry automatically",
      retryable: true,
    };
  }

  // PUT failures surfaced as generic Error with status info
  if (message.includes("PUT failed")) {
    return {
      code: "PUT_FAILED",
      message: "Upload server error — please retry",
      retryable: true,
    };
  }

  return {
    code: "UNKNOWN",
    message,
    retryable: true,
  };
}
