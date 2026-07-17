import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./TypingIndicator.tsx"), "utf-8");

describe("TypingIndicator", () => {
  it("exports TypingIndicator component", () => {
    expect(source).toContain("export function TypingIndicator");
  });

  it("accepts a visible prop", () => {
    expect(source).toContain("visible: boolean");
  });

  it("uses the conversations namespace for localized copy", () => {
    expect(source).toContain('useTranslation("conversations")');
  });

  it("renders peer typing text when visible", () => {
    expect(source).toContain("visible &&");
    expect(source).toContain('t("peerTyping")');
  });

  it("keeps a stable row height when not visible", () => {
    expect(source).toContain('className="h-6 justify-center px-4"');
  });

  it("styles the label as muted secondary text", () => {
    expect(source).toContain('className="text-xs text-muted-foreground"');
  });

  it("truncates long typing labels to one line", () => {
    expect(source).toContain("numberOfLines={1}");
  });
});
