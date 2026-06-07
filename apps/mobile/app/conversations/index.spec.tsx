import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./index.tsx"), "utf-8");

describe("ConversationsListScreen", () => {
  it("exports default screen component", () => {
    expect(source).toContain("export default function ConversationsListScreen");
  });

  it("renders ConversationList without duplicating list logic", () => {
    expect(source).toContain(
      'import { ConversationList } from "../../src/conversations/components/ConversationList"',
    );
    expect(source).toContain("<ConversationList />");
  });

  it("has a back button in header", () => {
    expect(source).toContain("router.back()");
    expect(source).toContain('accessibilityLabel="Go back"');
    expect(source).toContain("ArrowLeft");
  });

  it("shows Messages header title", () => {
    expect(source).toContain("Messages");
    expect(source).toContain("text-lg font-semibold");
  });
});
