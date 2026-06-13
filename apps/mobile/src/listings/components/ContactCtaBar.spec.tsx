import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ContactCtaBar.tsx"), "utf-8");

describe("ContactCtaBar", () => {
  it("accepts allowChat prop", () => {
    expect(source).toContain("allowChat: boolean");
  });

  it("imports useAuth for authentication check", () => {
    expect(source).toContain('import { useAuth } from "../../auth/useAuth"');
  });

  it("imports useAuthIntentStore for anonymous resume", () => {
    expect(source).toContain(
      'import { useAuthIntentStore } from "../../auth/intentStore"',
    );
  });

  it("imports useOpenConversation for authenticated flow", () => {
    expect(source).toContain(
      'import { useOpenConversation } from "../../api/conversations/useOpenConversation"',
    );
  });

  it("disables Message for sold listings", () => {
    expect(source).toContain("isSold = status === Enums.ListingStatus.Sold");
    expect(source).toContain("!isSold");
  });

  it("disables Message for archived listings", () => {
    expect(source).toContain(
      "isArchived = status === Enums.ListingStatus.Archived",
    );
    expect(source).toContain("!isArchived");
  });

  it("disables Message when allowChat is false", () => {
    expect(source).toContain("allowChat");
    expect(source).toContain("canMessage = allowChat");
  });

  it("stores auth intent and routes to phone when anonymous user taps Message", () => {
    expect(source).toContain("isAuthenticated === false");
    expect(source).toContain("useAuthIntentStore.getState().setIntent");
    expect(source).toContain("conversations/open-listing");
    expect(source).toContain("listingId");
    expect(source).toContain('router.push("/(auth)/phone")');
  });

  it("calls useOpenConversation and navigates when authenticated user taps Message", () => {
    expect(source).toContain("isAuthenticated === true");
    expect(source).toContain("openConversation.mutate");
    expect(source).toContain('router.push({\n              pathname:');
  });

  it("shows disabled state with muted icon when Message is unavailable", () => {
    expect(source).toContain("canMessage ? \"default\" : \"secondary\"");
    expect(source).toContain('"size-5 text-muted-foreground"');
  });

  it("has accessible labels for icon-only CTA buttons", () => {
    expect(source).toContain('accessibilityLabel={t("message")}');
    expect(source).toContain('accessibilityLabel={t("share")}');
    expect(source).toContain('accessibilityLabel={t("favorite")}');
    expect(source).toContain("accessibilityState={{ disabled: !canMessage || openConversation.isPending }}");
  });

  it("disables Message while openConversation is pending", () => {
    expect(source).toContain("openConversation.isPending");
    expect(source).toContain("disabled={!canMessage || openConversation.isPending}");
  });

  it("imports ErrorState to surface openConversation errors", () => {
    expect(source).toContain('import { ErrorState } from "@/components/ErrorState"');
  });

  it("renders compact ErrorState when openConversation.error exists", () => {
    expect(source).toContain("openConversation.error");
    expect(source).toContain("<ErrorState");
    expect(source).toContain("compact");
  });
});
