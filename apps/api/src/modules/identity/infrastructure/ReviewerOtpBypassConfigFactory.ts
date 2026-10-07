import type { ReviewerOtpBypassConfig } from "../domain/ports/ReviewerOtpBypassConfig";

interface RawReviewerOtpBypassAccount {
  phone?: unknown;
  email?: unknown;
  code?: unknown;
}

export function parseReviewerOtpBypassConfig(env: {
  REVIEW_DEMO_ACCOUNT_ENABLED?: boolean;
  REVIEW_DEMO_ACCOUNTS_JSON?: string;
  TESTER_ACCOUNTS_JSON?: string;
}): ReviewerOtpBypassConfig {
  const reviewers = env.REVIEW_DEMO_ACCOUNT_ENABLED
    ? JSON.parse(env.REVIEW_DEMO_ACCOUNTS_JSON ?? "[]") as RawReviewerOtpBypassAccount[]
    : [];
  const testers = JSON.parse(env.TESTER_ACCOUNTS_JSON ?? "[]") as RawReviewerOtpBypassAccount[];
  const raw = [...reviewers, ...testers];
  return {
    enabled: raw.length > 0,
    accounts: raw.map((entry) => ({
      phone: String(entry.phone),
      email: String(entry.email),
      code: String(entry.code),
    })),
  };
}
