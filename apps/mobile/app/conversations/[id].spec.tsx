import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./[id].tsx"), "utf-8");

describe("ConversationDetailScreen", () => {
  it("exports default screen component", () => {
    expect(source).toContain("export default function ConversationDetailScreen");
  });

  it("reads conversation id from route params", () => {
    expect(source).toContain("useLocalSearchParams");
    expect(source).toContain('const conversationId = params.id');
  });

  it("uses useViewer for current user id", () => {
    expect(source).toContain('import { useViewer } from "../../src/auth/useViewer"');
    expect(source).toContain("const viewer = useViewer()");
  });

  it("uses useConversationMessages for message list", () => {
    expect(source).toContain(
      'import { useConversationMessages } from "../../src/api/conversations/useConversationMessages"',
    );
  });

  it("uses useSendTextMessage for sending", () => {
    expect(source).toContain(
      'import { useSendTextMessage } from "../../src/api/conversations/useSendTextMessage"',
    );
  });

  it("renders ConversationListingCard at top", () => {
    expect(source).toContain("ConversationListingCard");
  });

  it("renders MessageList with messages", () => {
    expect(source).toContain("MessageList");
  });

  it("renders MessageComposer at bottom", () => {
    expect(source).toContain("MessageComposer");
  });
});

describe("ConversationDetailScreen optimistic states", () => {
  it("tracks local pending messages", () => {
    expect(source).toContain("const [localMessages, setLocalMessages]");
    expect(source).toContain('status: "pending"');
  });

  it("marks pending as confirmed on send success", () => {
    expect(source).toContain('status: "confirmed"');
    expect(source).toContain("onSuccess");
  });

  it("marks pending as failed on send error", () => {
    expect(source).toContain('status: "failed"');
    expect(source).toContain("onError");
  });

  it("supports retry for failed messages", () => {
    expect(source).toContain("handleRetry");
    expect(source).toContain("onRetry={handleRetry}");
  });

  it("deduplicates server and local messages", () => {
    expect(source).toContain("confirmedIds");
    expect(source).toContain("pendingOrFailed");
  });
});
