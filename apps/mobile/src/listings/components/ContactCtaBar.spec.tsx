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

  it("imports the auth intent store and the replay hook", () => {
    expect(source).toContain("useAuthIntentStore");
    expect(source).toContain("useReplayAuthAction");
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

  it("parks a Message action on the calling Listing when the User is signed out", () => {
    expect(source).toContain("isAuthenticated === false");
    expect(source).toContain("useAuthIntentStore.getState().requireSignIn(router, {");
    expect(source).toContain("const listingHref = `/(public)/listings/${listingId}` as const;");
    expect(source).toContain("returnTo: listingHref,");
    expect(source).toContain('action: { kind: "message", listingId }');
  });

  it("routes ♡ through the shared useListingFavorite hook with this Listing as returnTo", () => {
    expect(source).toContain('import { useListingFavorite } from "../useListingFavorite"');
    expect(source).toMatch(
      /useListingFavorite\(\{[^}]*returnTo: listingHref,\s*replayAfterSignIn: true,/,
    );
  });

  it("disables ♡ until the session check finishes, so a tap is never silently dropped", () => {
    expect(source).toContain("const favoriteDisabled = isFavoritePending || isAuthenticated === null;");
    expect(source).toContain("disabled={favoriteDisabled}");
  });

  it("never opens authentication with a bare push or a return replace", () => {
    expect(source).not.toContain('router.push("/(auth)/phone")');
    expect(source).not.toContain("conversations/open-listing");
  });

  it("replays Message and Favorite on the same screen after sign-in", () => {
    expect(source).toContain(
      'useReplayAuthAction("message", listingId, openListingConversation)',
    );
    expect(source).toContain("replayAfterSignIn: true");
  });

  // The replay runs before `useAuth` has re-read the stored session, so it must
  // share the signed-in code path rather than re-check the flag.
  it("shares one conversation-open path between tap and replay", () => {
    expect(source).toContain("const openListingConversation = () => {");
    expect(source).toContain("openConversation.mutate");
    expect(source).toContain("isAuthenticated === true");
    expect(source).toContain("openListingConversation();");
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

  it("shares the canonical auto.tm listing URL", () => {
    expect(source).toContain("`https://auto.tm/listings/${listingId}`");
  });

  it("prevents Call button text from overflowing on narrow screens", () => {
    expect(source).toContain('numberOfLines={1}');
    expect(source).toContain('>{t("call")}</Text>');
  });
});
