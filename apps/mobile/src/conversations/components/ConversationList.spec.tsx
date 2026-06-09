import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ConversationList.tsx"), "utf-8");

describe("ConversationList", () => {
  it("imports useConversations hook", () => {
    expect(source).toContain(
      'import { useConversations } from "../../api/conversations/useConversations"',
    );
  });

  it("imports ConversationListItem", () => {
    expect(source).toContain(
      'import { ConversationListItem } from "./ConversationListItem"',
    );
  });

  it("shows loading skeleton while pending", () => {
    expect(source).toContain("isPending");
    expect(source).toContain("LoadingSkeleton");
    expect(source).toContain("<Skeleton");
  });

  it("shows empty state when no conversations", () => {
    expect(source).toContain("conversations.length === 0");
    expect(source).toContain("EmptyState");
    expect(source).toContain('t("noConversationsYet")');
  });

  it("shows error state with retry", () => {
    expect(source).toContain("isError");
    expect(source).toContain("ErrorState");
    expect(source).toContain('t("couldNotLoadConversations")');
    expect(source).toContain('t("retry")');
  });

  it("uses FlatList for conversation items", () => {
    expect(source).toContain("<FlatList");
    expect(source).toContain("data={conversations}");
  });

  it("has pull-to-refresh via RefreshControl", () => {
    expect(source).toContain("<RefreshControl");
    expect(source).toContain("refreshing={isRefetching}");
    expect(source).toContain("onRefresh={handleRefresh}");
  });

  it("supports infinite scroll with onEndReached", () => {
    expect(source).toContain("onEndReached={handleEndReached}");
    expect(source).toContain("fetchNextPage");
    expect(source).toContain("hasNextPage");
  });

  it("renders items in server order (no sort mutation)", () => {
    expect(source).toContain("data?.pages.flatMap((page) => page.items)");
    expect(source).not.toMatch(/\.sort\(/);
  });

  it("flattens paginated conversation items", () => {
    expect(source).toContain("pages.flatMap");
  });
});
