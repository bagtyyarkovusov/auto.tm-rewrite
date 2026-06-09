import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./ConditionFilterControl.tsx"),
  "utf-8",
);

describe("ConditionFilterControl", () => {
  it("exports ConditionFilterControl component", () => {
    expect(source).toContain("export function ConditionFilterControl");
  });

  it("accepts value and onChange props", () => {
    expect(source).toContain("value: ConditionValue");
    expect(source).toContain("onChange: (value: ConditionValue) => void");
  });

  it("renders three segments: Any, New, Used", () => {
    expect(source).toContain('value: undefined');
    expect(source).toContain('t("new")');
    expect(source).toContain('t("used")');
  });

  it("uses Enums.ListingCondition.New for New value", () => {
    expect(source).toContain("Enums.ListingCondition.New");
  });

  it("uses Enums.ListingCondition.Used for Used value", () => {
    expect(source).toContain("Enums.ListingCondition.Used");
  });

  it("calls onChange with undefined for Any (clears filter)", () => {
    expect(source).toContain('{ value: undefined, label: t("any") }');
  });

  it("wires onPress to onChange for each segment", () => {
    expect(source).toContain("onPress={() => onChange(segment.value)}");
  });

  it("has accessibilityRole button on each segment", () => {
    expect(source).toContain('accessibilityRole="button"');
  });

  it("has accessibilityState selected on each segment", () => {
    expect(source).toContain("accessibilityState={{ selected }}");
  });

  it("has accessibilityLabel per segment", () => {
    expect(source).toContain('accessibilityLabel={`${segment.label} ${t("condition")}`}');
  });

  it("uses stable keys for each segment", () => {
    expect(source).toContain("key={segment.label}");
  });

  it("visually distinguishes selected segment with bg-card", () => {
    expect(source).toContain('selected && "bg-card"');
  });

  it("uses text-foreground for selected and text-muted-foreground for unselected", () => {
    expect(source).toContain(
      'selected ? "text-foreground" : "text-muted-foreground"',
    );
  });
});
