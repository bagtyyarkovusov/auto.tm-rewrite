import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "../../app/conversations/[id].tsx"), "utf-8");
const header = readFileSync(
  resolve(__dirname, "../../src/conversations/components/ConversationHeader.tsx"),
  "utf-8",
);

describe("ConversationDetailScreen quick replies", () => {
  it("passes showQuickReplies to MessageComposer", () => {
    expect(source).toContain("showQuickReplies:");
  });

  // The rule (loaded, empty, open, Listing not closed) is behaviour-tested in
  // src/conversations/showQuickReplies.spec.ts and the Conversation screen spec.
  it("decides quick replies with showQuickReplies from the loaded state", () => {
    expect(source).toContain("showQuickReplies({");
    expect(source).toContain("ready: !isLoading && !isError && !conversationFailed");
    expect(source).toContain("messageCount: allMessages.length");
  });
});

describe("ConversationDetailScreen conversation mute", () => {
  it("wires the mute mutation hook", () => {
    expect(source).toContain("useMuteConversation");
    expect(source).toContain("handleToggleMute");
  });

  it("shows an understated muted indicator in the header", () => {
    expect(header).toContain("BellOff");
    expect(header).toContain('t("conversationMuted")');
  });

  it("surfaces mute failures as a destructive toast", () => {
    expect(source).toContain('t("muteConversationError")');
    expect(source).toContain('variant: "destructive"');
  });
});
