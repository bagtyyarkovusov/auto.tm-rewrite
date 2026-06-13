import type { TFunction } from "i18next";

import { ApiError } from "../../api/client";

import { CompressionError } from "./compressor";
import type { UploadError } from "./types";

export function buildUploadError(err: unknown, t: TFunction): UploadError {
  if (err instanceof CompressionError) {
    return {
      code: "LOCAL_FILE_MISSING",
      message: t("uploadErrorLocalFileMissing"),
      retryable: false,
    };
  }

  if (err instanceof ApiError) {
    if (err.code === "NETWORK_ERROR") {
      return {
        code: "NETWORK_ERROR",
        message: t("uploadErrorNetwork"),
        retryable: true,
      };
    }
    if (err.status === 429) {
      return {
        code: "RATE_LIMITED",
        message: t("uploadErrorRateLimited"),
        retryable: true,
      };
    }
    return {
      code: "PRESIGN_FAILED",
      message: t("uploadErrorPresignFailed"),
      retryable: true,
    };
  }

  const message = err instanceof Error ? err.message : t("uploadErrorUnknown");

  // Network errors from fetch / expo-file-system typically contain "network" or are TypeErrors
  if (
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("fetch") ||
    message.toLowerCase().includes("internet") ||
    err instanceof TypeError
  ) {
    return {
      code: "NETWORK_ERROR",
      message: t("uploadErrorNetwork"),
      retryable: true,
    };
  }

  // PUT failures surfaced as generic Error with status info
  if (message.includes("PUT failed")) {
    return {
      code: "PUT_FAILED",
      message: t("uploadErrorPutFailed"),
      retryable: true,
    };
  }

  return {
    code: "UNKNOWN",
    message,
    retryable: true,
  };
}
