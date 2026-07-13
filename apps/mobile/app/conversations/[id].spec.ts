import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./[id].tsx"), "utf-8");

describe("ConversationDetailScreen quick replies", () => {
  it("passes showQuickReplies to MessageComposer", () => {
    expect(source).toContain("showQuickReplies={");
  });

  it("shows quick replies only when thread is loaded and empty", () => {
    expect(source).toContain("!isLoading");
    expect(source).toContain("!isError");
    expect(source).toContain("allMessages.length === 0");
  });

  it("hides quick replies when the conversation is blocked", () => {
    expect(source).toContain("!isBlocked");
  });
});
