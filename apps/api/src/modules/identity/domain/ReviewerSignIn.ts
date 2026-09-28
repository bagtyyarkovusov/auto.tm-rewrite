import type { ConstantTimeComparatorPort } from "./ports/ConstantTimeComparatorPort";
import type {
  ReviewerOtpBypassAccount,
  ReviewerOtpBypassConfig,
} from "./ports/ReviewerOtpBypassConfig";
import type { SignInCodeChannel } from "./types";

export function findReviewerAccount(
  config: ReviewerOtpBypassConfig,
  comparator: ConstantTimeComparatorPort,
  channel: SignInCodeChannel,
  destination: string,
): ReviewerOtpBypassAccount | null {
  if (!config.enabled) return null;

  let matched: ReviewerOtpBypassAccount | null = null;
  for (const account of config.accounts) {
    if (comparator.compare(destination, account[channel])) {
      matched = account;
    }
  }
  return matched;
}

export function matchesReviewerCredential(
  config: ReviewerOtpBypassConfig,
  comparator: ConstantTimeComparatorPort,
  channel: SignInCodeChannel,
  destination: string,
  code: string,
): boolean {
  if (!config.enabled) return false;

  let matched = false;
  for (const account of config.accounts) {
    const destinationMatches = comparator.compare(destination, account[channel]);
    const codeMatches = comparator.compare(code, account.code);
    matched = matched || (destinationMatches && codeMatches);
  }
  return matched;
}
