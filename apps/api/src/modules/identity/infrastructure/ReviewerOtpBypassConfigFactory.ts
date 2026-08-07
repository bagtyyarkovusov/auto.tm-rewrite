import type { ReviewerOtpBypassConfig } from "../domain/ports/ReviewerOtpBypassConfig";

interface RawReviewerOtpBypassAccount {
  phone?: unknown;
  code?: unknown;
}

export function parseReviewerOtpBypassConfig(env: {
  REVIEW_DEMO_ACCOUNT_ENABLED?: boolean;
  REVIEW_DEMO_ACCOUNTS_JSON?: string;
}): ReviewerOtpBypassConfig {
  if (!env.REVIEW_DEMO_ACCOUNT_ENABLED) {
    return { enabled: false, accounts: [] };
  }

  const raw = JSON.parse(env.REVIEW_DEMO_ACCOUNTS_JSON ?? "[]") as RawReviewerOtpBypassAccount[];
  return {
    enabled: true,
    accounts: raw.map((entry) => ({
      phone: String(entry.phone),
      code: String(entry.code),
    })),
  };
}
