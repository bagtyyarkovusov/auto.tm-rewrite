import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ReportSheet.tsx"), "utf-8");
const messageSource = readFileSync(
  resolve(__dirname, "./MessageReportSheet.tsx"),
  "utf-8",
);
const listingScreenSource = readFileSync(
  resolve(__dirname, "../../../app/(public)/listings/[id].tsx"),
  "utf-8",
);

describe("ReportSheet auth-on-action", () => {
  it("parks a report action on the calling Listing when the User is signed out", () => {
    expect(source).toContain("isAuthenticated === false");
    expect(source).toContain("useAuthIntentStore.getState().requireSignIn(router, intent)");
    expect(source).toContain("returnTo: `/(public)/listings/${targetId}`");
    expect(source).toContain('action: { kind: "report", listingId: targetId }');
  });

  it("returns a user report to the tabs without a Listing-scoped action", () => {
    expect(source).toContain('targetType === "listing"');
    expect(source).toContain(': { returnTo: "/(tabs)" }');
  });

  it("closes the portal-rendered sheet before the auth screens open", () => {
    const closeIndex = source.indexOf("onOpenChange(false);");
    const requireIndex = source.indexOf("requireSignIn(router, intent)");
    expect(closeIndex).toBeGreaterThan(-1);
    expect(requireIndex).toBeGreaterThan(closeIndex);
  });

  it("never opens authentication with a bare push", () => {
    expect(source).not.toContain('router.push("/(auth)/phone")');
    expect(messageSource).not.toContain('router.push("/(auth)/phone")');
  });

  it("returns a message report to its Conversation", () => {
    expect(messageSource).toContain("useAuthIntentStore.getState().requireSignIn(router, {");
    expect(messageSource).toContain("returnTo: `/conversations/${conversationId}`");
  });
});

describe("Listing detail report replay", () => {
  it("reopens the report sheet for a pending report action", () => {
    expect(listingScreenSource).toContain(
      'useReplayAuthAction("report", id, () => setReportOpen(true))',
    );
  });
});
