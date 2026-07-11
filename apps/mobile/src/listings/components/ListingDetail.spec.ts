import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ListingDetail.tsx"), "utf-8");

describe("ListingDetail VIN history surfacing", () => {
  it("renders a VIN history section", () => {
    expect(source).toContain("VinHistorySection");
    expect(source).toContain('t("vinHistory")');
  });

  it("shows an honest empty state when VIN is not decoded", () => {
    expect(source).toContain('t("vinNotDecoded")');
    expect(source).toContain("vinHistory.decoded === false");
  });

  it("shows a compact state when VIN is missing", () => {
    expect(source).toContain('t("vinNotProvided")');
    expect(source).toContain("!vin");
  });

  it("renders only decoded fields returned by the decoder", () => {
    expect(source).toContain("vinHistory.brand");
    expect(source).toContain("vinHistory.model");
    expect(source).toContain("vinHistory.year");
    expect(source).toContain("vinHistory.bodyType");
    expect(source).toContain("vinHistory.engineType");
  });

  it("renders decoder confidence as a percentage", () => {
    expect(source).toContain('t("vinConfidence"');
    expect(source).toContain("Math.round(vinHistory.confidence * 100)");
  });

  it("places the VIN history section below condition disclosure", () => {
    const conditionIndex = source.indexOf("ConditionDisclosureSection");
    const vinIndex = source.indexOf("VinHistorySection");
    expect(conditionIndex).toBeGreaterThan(0);
    expect(vinIndex).toBeGreaterThan(conditionIndex);
  });

  it("does not imply accident or ownership history in the VIN section", () => {
    const vinSectionStart = source.indexOf("function VinHistorySection");
    const vinSectionEnd = source.indexOf("function ConditionDisclosureSection", vinSectionStart);
    const vinSection = source.slice(vinSectionStart, vinSectionEnd);
    expect(vinSection).not.toContain("accident");
    expect(vinSection).not.toContain("theft");
    expect(vinSection).not.toContain("owner");
  });
});
