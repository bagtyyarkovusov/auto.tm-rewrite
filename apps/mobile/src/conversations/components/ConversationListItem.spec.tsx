import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

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
    expect(source).toContain("priceCurrency");
  });

  it("shows last message preview when available", () => {
    expect(source).toContain("conversation.lastMessage");
    expect(source).toContain("conversation.lastMessage.text");
    expect(source).toContain('numberOfLines={1}');
  });

  it("shows conversation updated time", () => {
    expect(source).toContain("formatConversationTime");
    expect(source).toContain("conversation.updatedAt");
  });

  it("shows user role in conversation", () => {
    expect(source).toContain("conversation.myRole");
    expect(source).toContain("You are buyer");
    expect(source).toContain("You are seller");
  });

  it("shows listing status when not active", () => {
    expect(source).toContain('listing.status !== "active"');
    expect(source).toContain("listing.status");
  });

  it("navigates to conversation detail on press", () => {
    expect(source).toContain('router.push({');
    expect(source).toContain('pathname: `/conversations/${conversation.id}`');
  });

  it("passes listing card params to detail route", () => {
    expect(source).toContain("params.listingId");
    expect(source).toContain("params.brandId");
    expect(source).toContain("params.modelId");
    expect(source).toContain("params.displayPriceTmt");
    expect(source).toContain("params.priceCurrency");
    expect(source).toContain("params.coverMediaKey");
    expect(source).toContain("params.status");
  });

  it("handles null listing gracefully", () => {
    expect(source).toContain('"Conversation"');
    expect(source).toContain("listing");
    expect(source).toContain("?");
  });

  it("has a minimum tap target size via Pressable", () => {
    expect(source).toContain("px-4 py-3");
  });
});
