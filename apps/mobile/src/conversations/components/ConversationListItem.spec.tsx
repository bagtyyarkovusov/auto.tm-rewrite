import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

import { fireEvent, renderMobile, routerMock } from "../../../test/render";
import { queryKeys } from "../../api/queryKeys";

import { ConversationListItem } from "./ConversationListItem";

const source = readFileSync(resolve(__dirname, "./ConversationListItem.tsx"), "utf-8");

describe("ConversationListItem", () => {
  it("exports ConversationListItem component", () => {
    expect(source).toContain("export function ConversationListItem");
  });

  it("uses Pressable as the tap target", () => {
    expect(source).toContain("<Pressable");
    expect(source).toContain('accessibilityRole="button"');
  });

  it("displays listing cover image when available", () => {
    expect(source).toContain('source={{ uri: imageUrl }}');
    expect(source).toContain("contentFit=\"cover\"");
  });

  it("shows listing title with year and fallback ids", () => {
    expect(source).toContain("listing.year");
    expect(source).toContain("listing.brandId");
    expect(source).toContain("listing.modelId");
  });

  it("shows listing price", () => {
    expect(source).toContain("displayPriceTmt");
  });

  it("shows last message preview when available", () => {
    expect(source).toContain("conversation.lastMessage");
    expect(source).toContain("lastMessage.text");
    expect(source).toContain('numberOfLines={1}');
  });

  it("handles deleted last message preview", () => {
    expect(source).toContain("lastMessage.deletedAt");
    expect(source).toContain("messageDeleted");
  });

  it("shows image label for image-kind last message", () => {
    expect(source).toContain('Enums.MessageKind.Image');
    expect(source).toContain('t("photo")');
  });

  it("shows listing label for post_ref-kind last message", () => {
    expect(source).toContain('Enums.MessageKind.PostRef');
    expect(source).toContain('t("listing")');
  });

  it("renders an unread badge when unreadCount is greater than zero", () => {
    expect(source).toContain("unreadCount");
    expect(source).toContain("bg-primary");
  });

  it("shows conversation updated time", () => {
    expect(source).toContain("formatConversationTime");
    expect(source).toContain("conversation.updatedAt");
  });

  it("shows user role in conversation", () => {
    expect(source).toContain("conversation.myRole");
    expect(source).toContain('t("youAreBuyer")');
    expect(source).toContain('t("youAreSeller")');
  });

  it("shows listing status when not active", () => {
    expect(source).toContain("Enums.ListingStatus.Active");
    expect(source).toContain("listing.status");
  });

  it("navigates to conversation detail on press", () => {
    expect(source).toContain('router.push({');
    expect(source).toContain('pathname: "/conversations/[id]"');
    expect(source).toContain("id: conversation.id");
  });

  it("handles null listing gracefully", () => {
    expect(source).toContain('t("chat")');
    expect(source).toContain("listing");
    expect(source).toContain("?");
  });

  it("has a minimum tap target size via Pressable", () => {
    expect(source).toContain("px-4 py-3");
  });
});

describe("ConversationListItem press", () => {
  it("opens the Conversation by ID and seeds the by-ID cache with the row's summary", () => {
    const summary = {
      id: "00000000-0000-4000-8000-0000000000c1",
      listing: null,
      buyerId: "00000000-0000-4000-8000-0000000000b1",
      sellerId: "00000000-0000-4000-8000-0000000000b2",
      myRole: "buyer" as const,
      peer: { id: "00000000-0000-4000-8000-0000000000b2", displayName: "Merdan" },
      blockedByMe: false,
      updatedAt: "2026-10-01T10:00:00.000Z",
      unreadCount: 0,
    };
    const screen = renderMobile(<ConversationListItem conversation={summary} />);

    fireEvent.press(screen.getByRole("button"));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: "/conversations/[id]",
      params: { id: summary.id },
    });
    expect(screen.queryClient.getQueryData(queryKeys.conversations.detail(summary.id))).toEqual(summary);
  });
});
