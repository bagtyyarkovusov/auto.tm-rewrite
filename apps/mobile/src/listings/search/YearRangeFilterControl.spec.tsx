import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

import { parseYearInput } from "./yearRangeFilterLogic";

const source = readFileSync(
  resolve(__dirname, "./YearRangeFilterControl.tsx"),
  "utf-8",
);
const logicSource = readFileSync(
  resolve(__dirname, "./yearRangeFilterLogic.ts"),
  "utf-8",
);

const currentYear = new Date().getFullYear();
const maxYear = currentYear + 1;

describe("parseYearInput", () => {
  it("returns undefined for empty string", () => {
    expect(parseYearInput("")).toBeUndefined();
  });

  it("returns undefined for non-4-digit input", () => {
    expect(parseYearInput("20")).toBeUndefined();
    expect(parseYearInput("202")).toBeUndefined();
  });

  it("returns the number for a valid 4-digit year", () => {
    expect(parseYearInput("2018")).toBe(2018);
    expect(parseYearInput("1900")).toBe(1900);
    expect(parseYearInput(String(maxYear))).toBe(maxYear);
  });

  it("rejects years below 1900", () => {
    expect(parseYearInput("1899")).toBeUndefined();
  });

  it("rejects years above current year + 1", () => {
    expect(parseYearInput(String(maxYear + 1))).toBeUndefined();
  });

  it("strips non-digit characters before parsing", () => {
    expect(parseYearInput("20x1y8")).toBe(2018);
    expect(parseYearInput("20 18")).toBe(2018);
  });

  it("truncates to 4 digits", () => {
    expect(parseYearInput("20185")).toBe(2018);
  });
});

describe("YearRangeFilterControl source", () => {
  it("exports a named component", () => {
    expect(source).toContain("export function YearRangeFilterControl");
  });

  it("accepts draft and setField props", () => {
    expect(source).toContain("draft: ListingFilter");
    expect(source).toContain("setField: UseListingFiltersReturn[\"setField\"]");
  });

  it("renders two RNR Input fields", () => {
    expect(source).toContain("<Input");
    const inputCount = (source.match(/<Input/g) ?? []).length;
    expect(inputCount).toBe(2);
  });

  it("uses number-pad keyboard and maxLength 4", () => {
    expect(source).toContain('keyboardType="number-pad"');
    expect(source).toContain("maxLength={4}");
  });

  it("has accessibility labels for both inputs", () => {
    expect(source).toContain('accessibilityLabel="Minimum year"');
    expect(source).toContain('accessibilityLabel="Maximum year"');
  });

  it("writes yearMin and yearMax to the draft", () => {
    expect(source).toContain('setField("yearMin"');
    expect(source).toContain('setField("yearMax"');
  });

  it("shows a text-destructive error when yearMin > yearMax", () => {
    expect(source).toContain("text-destructive");
    expect(source).toContain("draft.yearMin > draft.yearMax");
  });

  it("syncs local text state when draft changes externally", () => {
    expect(source).toContain("useEffect");
    expect(source).toContain("draft.yearMin?.toString()");
    expect(source).toContain("draft.yearMax?.toString()");
  });

  it("uses flex-row layout for the two inputs", () => {
    expect(source).toContain("flex-row");
  });

  it("has a 'Year range' label", () => {
    expect(source).toContain("Year range");
  });

  it("bound lower limit is 1900", () => {
    expect(logicSource).toContain("MIN_YEAR = 1900");
  });

  it("bound upper limit is current year + 1", () => {
    expect(logicSource).toContain("new Date().getFullYear() + 1");
  });
});
