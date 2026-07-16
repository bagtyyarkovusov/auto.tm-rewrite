import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./MessageList.tsx"), "utf-8");

describe("MessageList", () => {
  it("exports MessageList component", () => {
    expect(source).toContain("export function MessageList");
  });

  it("renders MessageBubble for each message", () => {
    expect(source).toContain("<MessageBubble");
    expect(source).toContain("data={messages}");
  });

  it("passes currentUserId to MessageBubble for alignment", () => {
    expect(source).toContain("currentUserId");
    expect(source).toContain("isMine={item.senderId === currentUserId}");
  });

  it("accepts reportedMessageIds to mark reported messages", () => {
    expect(source).toContain("reportedMessageIds?: Set<string>");
    expect(source).toContain("reported={reported.has(item.id)}");
  });

  it("forwards retry, delete, and report callbacks", () => {
    expect(source).toContain("onRetry");
    expect(source).toContain("onDelete");
    expect(source).toContain("onReport");
  });

  it("forwards image and post_ref press callbacks", () => {
    expect(source).toContain("onImagePress");
    expect(source).toContain("onPostRefPress");
  });

  it("inverts the FlatList for bottom-aligned chat flow", () => {
    expect(source).toContain("inverted");
  });

  it("renders an empty state when there are no messages", () => {
    expect(source).toContain("ListEmptyComponent");
    expect(source).toContain('t("noMessagesYet")');
  });
});
