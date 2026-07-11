import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./InspectionInterestCta.tsx"),
  "utf-8",
);

describe("InspectionInterestCta", () => {
  it("imports auth, intent store, and mutation hook", () => {
    expect(source).toContain('import { useAuth } from "../../auth/useAuth"');
    expect(source).toContain(
      'import { useAuthIntentStore } from "../../auth/intentStore"',
    );
    expect(source).toContain(
      'import { useCreateInspectionInterest } from "../../api/reports/useCreateInspectionInterest"',
    );
  });

  it("accepts listingId, open, onOpenChange, and disabled props", () => {
    expect(source).toContain("listingId: string");
    expect(source).toContain("open: boolean");
    expect(source).toContain("onOpenChange: (open: boolean) => void");
    expect(source).toContain("disabled?: boolean");
  });

  it("routes anonymous users through auth-on-action before submitting", () => {
    expect(source).toContain("isAuthenticated === false");
    expect(source).toContain("useAuthIntentStore.getState().setIntent");
    expect(source).toContain('returnPath: `/(public)/listings/${listingId}`');
    expect(source).toContain('router.push("/(auth)/phone")');
  });

  it("submits interest when authenticated", () => {
    expect(source).toContain("createInterest.mutate");
    expect(source).toContain("useCreateInspectionInterest");
  });

  it("renders success state with interest-received copy", () => {
    expect(source).toContain("submitted");
    expect(source).toContain('t("inspectionInterestReceived")');
  });

  it("renders error state using mapErrorToCopy", () => {
    expect(source).toContain('import { mapErrorToCopy } from "../../api/getErrorCopy"');
    expect(source).toContain("errorCopy");
  });

  it("disables the CTA trigger when disabled prop is true", () => {
    expect(source).toContain("disabled={disabled}");
    expect(source).toContain("opacity-70");
    expect(source).toContain('t("inspectionInterestUnavailable")');
  });

  it("uses a numeric input for willingness-to-pay", () => {
    expect(source).toContain('keyboardType="number-pad"');
    expect(source).toContain("maxLength={5}");
  });

  it("validates willingness-to-pay between 0 and 10000", () => {
    expect(source).toContain("value > 10000");
    expect(source).toContain('t("willingnessToPayInvalid")');
  });

  it("preserves willingness-to-pay input after validation errors", () => {
    expect(source).toContain("wtpText");
    expect(source).toContain("setWtpText");
    // Validation errors set validationError, not the input value.
    expect(source).toContain("setValidationError");
  });

  it("uses a minimum 44 pt tap target for the trigger", () => {
    expect(source).toContain("min-h-[44px]");
  });
});
