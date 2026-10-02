import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "../../app/conversations/[id].tsx"), "utf-8");
const header = readFileSync(
  resolve(__dirname, "../../src/conversations/components/ConversationHeader.tsx"),
  "utf-8",
);
const menu = readFileSync(
  resolve(__dirname, "../../src/conversations/components/ConversationMenuSheet.tsx"),
  "utf-8",
);

describe("ConversationDetailScreen quick replies", () => {
  it("passes showQuickReplies to MessageComposer", () => {
    expect(source).toContain("showQuickReplies:");
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

describe("ConversationDetailScreen conversation mute", () => {
  it("wires the mute mutation hook", () => {
    expect(source).toContain("useMuteConversation");
    expect(source).toContain("handleToggleMute");
  });

  it("exposes mute and unmute menu items in the thread header", () => {
    expect(menu).toContain('t("muteConversation")');
    expect(menu).toContain('t("unmuteConversation")');
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
