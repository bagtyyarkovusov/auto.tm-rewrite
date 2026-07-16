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

describe("ConversationDetailScreen conversation mute", () => {
  it("wires the mute mutation hook", () => {
    expect(source).toContain("useMuteConversation");
    expect(source).toContain("handleToggleMute");
  });

  it("exposes mute and unmute menu items in the thread header", () => {
    expect(source).toContain('t("muteConversation")');
    expect(source).toContain('t("unmuteConversation")');
  });

  it("shows an understated muted indicator in the header", () => {
    expect(source).toContain("BellOff");
    expect(source).toContain('t("conversationMuted")');
  });

  it("surfaces mute failures as a destructive toast", () => {
    expect(source).toContain('t("muteConversationError")');
    expect(source).toContain('variant: "destructive"');
  });
});
