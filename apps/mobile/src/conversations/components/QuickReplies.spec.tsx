import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./QuickReplies.tsx"), "utf-8");

describe("QuickReplies", () => {
  it("exports QuickReplies component", () => {
    expect(source).toContain("export function QuickReplies");
  });

  it("accepts onSelect callback prop", () => {
    expect(source).toContain("onSelect: (text: string) => void");
  });

  it("has a disabled prop", () => {
    expect(source).toContain("disabled?: boolean");
  });

  it("renders a horizontal ScrollView for compact scrolling", () => {
    expect(source).toContain("<ScrollView");
    expect(source).toContain("horizontal");
    expect(source).toContain('showsHorizontalScrollIndicator={false}');
  });

  it("defines four static quick reply intents", () => {
    expect(source).toContain('key: "available"');
    expect(source).toContain('key: "seeIt"');
    expect(source).toContain('key: "finalPrice"');
    expect(source).toContain('key: "condition"');
  });

  it("uses the conversations namespace for localized copy", () => {
    expect(source).toContain('useTranslation("conversations")');
  });

  it("uses RNR Button chips", () => {
    expect(source).toContain("<Button");
    expect(source).toContain('variant="secondary"');
    expect(source).toContain('size="sm"');
  });

  it("forwards disabled state to each chip", () => {
    expect(source).toContain("disabled={disabled}");
  });

  it("passes translated text to onSelect when a chip is pressed", () => {
    expect(source).toContain("onPress={() => onSelect(t(reply.translationKey))}");
  });

  it("caps chip copy at one line", () => {
    expect(source).toContain("numberOfLines={1}");
  });

  it("hides horizontal scroll indicator", () => {
    expect(source).toContain('showsHorizontalScrollIndicator={false}');
  });
});
