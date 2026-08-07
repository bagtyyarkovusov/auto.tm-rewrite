export interface ReviewerOtpBypassAccount {
  phone: string;
  code: string;
}

export interface ReviewerOtpBypassConfig {
  enabled: boolean;
  accounts: ReviewerOtpBypassAccount[];
}

export const REVIEWER_OTP_BYPASS_CONFIG = Symbol("ReviewerOtpBypassConfig");
