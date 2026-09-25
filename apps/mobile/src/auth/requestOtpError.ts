import type { ApiError } from "../api/client";

type Translate = (key: string) => string;

export function getRequestOtpErrorCopy(
  error: ApiError,
  t: Translate,
  invalidKey: "phoneFormatError" | "emailFormatError",
): string {
  if (error.code === "VALIDATION_FAILED") return t(invalidKey);
  if (error.code === "NETWORK_ERROR" || error.status === 0) return t("offline");
  if (error.code === "RATE_LIMITED" || error.status === 429) {
    return t("rateLimitedCode");
  }
  return t("requestFailed");
}
