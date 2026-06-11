import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "DraftCard.tsx"), "utf-8");

describe("DraftCard structure", () => {
  it("renders a Pressable card with cover image and draft identity", () => {
    expect(source).toContain("<Pressable");
    expect(source).toContain("<Image");
    expect(source).toContain("identity");
  });

  it("shows updated date and photo count", () => {
    expect(source).toContain("formatDate(draft.updatedAt, i18n.language)");
    expect(source).toContain("photoCount");
  });

  it("renders step progress indicator", () => {
    expect(source).toContain("<Progress");
    expect(source).toContain("progressPercent");
  });

  it("has Resume and Discard actions", () => {
    expect(source).toContain('t("continueListing")');
    expect(source).toContain('t("discard")');
    expect(source).toContain("onResume(draft)");
    expect(source).toContain("setShowConfirm(true)");
  });

  it("uses AlertDialog for destructive discard confirmation", () => {
    expect(source).toContain("<AlertDialog");
    expect(source).toContain('t("discardListingTitle")');
    expect(source).toContain("AlertDialogAction");
    expect(source).toContain('className="bg-destructive"');
  });

  it("falls back safely when brand/model are missing", () => {
    expect(source).toContain('t("untitledDraft")');
    expect(source).toContain('t("unnamedDraft")');
  });
});
