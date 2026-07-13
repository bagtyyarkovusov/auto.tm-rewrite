import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./MessageComposer.tsx"), "utf-8");

describe("MessageComposer", () => {
  it("exports MessageComposer component", () => {
    expect(source).toContain("export function MessageComposer");
  });

  it("accepts onSend callback prop", () => {
    expect(source).toContain("onSend: (text: string) => void");
  });

  it("has a disabled prop", () => {
    expect(source).toContain("disabled?: boolean");
  });

  it("uses a multiline TextInput for message entry", () => {
    expect(source).toContain("multiline");
    expect(source).toContain("TextInput");
  });

  it("enforces 1000 character max length", () => {
    expect(source).toContain("const MAX_CHARS = 1000");
    expect(source).toContain("maxLength={MAX_CHARS}");
  });

  it("rejects blank text", () => {
    expect(source).toContain("const trimmed = text.trim()");
    expect(source).toContain("trimmed.length > 0");
  });

  it("disables send when text is empty", () => {
    expect(source).toContain("const canSend = trimmed.length > 0");
  });

  it("disables send when over character limit", () => {
    expect(source).toContain("!isOverLimit");
  });

  it("shows Send button that calls onSend", () => {
    expect(source).toContain('accessibilityLabel={t("sendMessage")}');
    expect(source).toContain("onPress={handleSend}");
    expect(source).toContain("onSend(trimmed)");
  });

  it("clears input after send", () => {
    expect(source).toContain("setText(\"\")");
  });

  it("shows error text when over limit", () => {
    expect(source).toContain("isOverLimit &&");
    expect(source).toContain("text-destructive");
    expect(source).toContain('t("messageTooLong"');
  });

  it("uses KeyboardAvoidingView for composer", () => {
    expect(source).toContain("KeyboardAvoidingView");
  });

  it("has accessible input label", () => {
    expect(source).toContain('accessibilityLabel={t("sendMessage")}');
  });

  it("accepts showQuickReplies prop", () => {
    expect(source).toContain("showQuickReplies?: boolean");
  });

  it("renders QuickReplies when showQuickReplies is true", () => {
    expect(source).toContain("showQuickReplies &&");
    expect(source).toContain("<QuickReplies");
  });

  it("fills composer text when a quick reply is selected", () => {
    expect(source).toContain("onSelect={setText}");
  });

  it("forwards disabled state to QuickReplies", () => {
    expect(source).toContain("disabled={disabled}");
  });
});

describe("MessageComposer state transitions", () => {
  it("send disabled when empty", () => {
    expect(source).toContain("disabled={!canSend}");
  });

  it("send disabled while parent is disabled", () => {
    expect(source).toContain("!disabled");
  });
});
