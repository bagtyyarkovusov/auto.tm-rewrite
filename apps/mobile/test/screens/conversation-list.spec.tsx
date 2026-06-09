// Relocated out of `app/` (was app/conversations/index.spec.tsx): a *.spec under the
// Expo Router app dir gets bundled by require.context — importing Node `fs` breaks the
// native bundle and registers a bogus route. Test files must live outside `app/`
// (Expo Router docs); metro.config.js resolver.blockList is the backstop. Node/vitest.
import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../../app/conversations/index.tsx"),
  "utf-8",
);

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
    expect(source).toContain('accessibilityLabel={t("goBack")}');
    expect(source).toContain("ArrowLeft");
  });

  it("shows Messages header title", () => {
    expect(source).toContain('t("messages")');
    expect(source).toContain("text-lg font-semibold");
  });
});
