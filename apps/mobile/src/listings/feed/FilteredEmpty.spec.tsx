import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./FilteredEmpty.tsx"),
  "utf-8",
);

describe("FilteredEmpty", () => {
  it("exports FilteredEmpty component", () => {
    expect(source).toContain("export function FilteredEmpty");
  });

  it("accepts onReset prop", () => {
    expect(source).toContain("onReset: () => void");
  });

  it("renders 'No listings match' heading", () => {
    expect(source).toContain("No listings match");
  });

  it("renders 'Try adjusting filters' subtext", () => {
    expect(source).toContain("Try adjusting filters");
  });

  it("has a Reset filters button", () => {
    expect(source).toContain("Reset filters");
  });

  it("calls onReset when the button is pressed", () => {
    expect(source).toContain("onPress={onReset}");
  });

  it("uses brand pill button variant for the primary action", () => {
    expect(source).toContain('variant="brand"');
    expect(source).toContain('size="pill"');
  });

  it("uses muted-foreground icon matching FeedEmpty/FeedError visual language", () => {
    expect(source).toContain('className="size-8 text-muted-foreground"');
  });

  it("uses semantic text tokens", () => {
    expect(source).toContain("text-foreground");
    expect(source).toContain("text-muted-foreground");
  });
});
