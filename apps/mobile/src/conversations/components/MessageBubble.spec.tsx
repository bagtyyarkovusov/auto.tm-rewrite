import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./MessageBubble.tsx"), "utf-8");

describe("MessageBubble", () => {
  it("exports MessageBubble component", () => {
    expect(source).toContain("export function MessageBubble");
  });

  it("accepts text, isMine, status, and createdAt props", () => {
    expect(source).toContain("text: string");
    expect(source).toContain("isMine: boolean");
    expect(source).toContain("status: MessageStatus");
    expect(source).toContain("createdAt: string");
  });

  it("supports sent, delivered, and read statuses", () => {
    expect(source).toContain('"sent"');
    expect(source).toContain('"delivered"');
    expect(source).toContain('"read"');
  });

  it("renders a delivered/read check icon for own messages", () => {
    expect(source).toContain("StatusIcon");
    expect(source).toContain("Check");
    expect(source).toContain("CheckCheck");
  });

  it("accepts onRetry callback for failed messages", () => {
    expect(source).toContain("onRetry?: () => void");
  });

  it("accepts delete affordance props", () => {
    expect(source).toContain("deletedAt?: string | null");
    expect(source).toContain("canDelete?: boolean");
    expect(source).toContain("onDelete?: () => void");
  });

  it("aligns own messages to the right", () => {
    expect(source).toContain('isMine ? "justify-end" : "justify-start"');
  });

  it("uses primary background for own messages", () => {
    expect(source).toContain('isMine\n              ? "bg-primary rounded-br-md"');
  });

  it("uses muted background for peer messages", () => {
    expect(source).toContain(': "bg-muted rounded-bl-md"');
  });

  it("renders deleted state with muted style", () => {
    expect(source).toContain("isDeleted");
    expect(source).toContain('"bg-muted/60 rounded-md"');
    expect(source).toContain('t("messageDeleted")');
  });

  it("shows pending status text", () => {
    expect(source).toContain('status === "pending"');
    expect(source).toContain('t("sending")');
  });

  it("shows failed status text with retry affordance", () => {
    expect(source).toContain('status === "failed"');
    expect(source).toContain('t("failedToSend")');
    expect(source).toContain("RotateCcw");
    expect(source).toContain("onRetry");
  });

  it("has retry accessibility label", () => {
    expect(source).toContain('accessibilityLabel={t("retry")}');
  });

  it("uses hitSlop for retry tap target", () => {
    expect(source).toContain("hitSlop");
  });
});

describe("MessageBubble image support", () => {
  it("accepts kind prop for text, image, or post_ref messages", () => {
    expect(source).toContain('kind?: "text" | "image" | "post_ref"');
  });

  it("accepts image metadata", () => {
    expect(source).toContain("metadata?: ImageMessageMetadata | PostRefMessageMetadata");
    expect(source).toContain("key: string");
  });

  it("accepts post_ref card callbacks", () => {
    expect(source).toContain("onPostRefPress?: (listingId: string) => void");
  });

  it("accepts local image URI for pending/failed previews", () => {
    expect(source).toContain("localImageUri?: string");
  });

  it("accepts image press callback", () => {
    expect(source).toContain("onImagePress?: () => void");
  });

  it("renders an image bubble for image kind", () => {
    expect(source).toContain("<ImageBubble");
    expect(source).toContain('contentFit="cover"');
  });

  it("builds remote image URL from metadata key", () => {
    expect(source).toContain("buildChatImageUrl");
  });
});
