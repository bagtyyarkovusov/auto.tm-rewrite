// Relocated out of `app/` (was app/conversations/open-listing.spec.tsx): a *.spec under
// the Expo Router app dir gets bundled by require.context — importing Node `fs` breaks the
// native bundle and registers a bogus route. Test files must live outside `app/`
// (Expo Router docs); metro.config.js resolver.blockList is the backstop. Node/vitest.
import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../../app/conversations/open-listing.tsx"),
  "utf-8",
);

describe("OpenListingConversationScreen", () => {
  it("exports default redirector screen", () => {
    expect(source).toContain("export default function OpenListingConversationScreen");
  });

  it("reads listingId from search params", () => {
    expect(source).toContain("useLocalSearchParams");
    expect(source).toContain('listingId: string');
  });

  it("uses useOpenConversation hook", () => {
    expect(source).toContain(
      'import { useOpenConversation } from "../../src/api/conversations/useOpenConversation"',
    );
  });

  it("calls openConversation mutate on mount", () => {
    expect(source).toContain("mutate({ listingId })");
  });

  it("navigates to conversation detail on success", () => {
    expect(source).toContain("router.replace");
    expect(source).toContain("/conversations/");
  });

  it("passes listing card params to conversation detail", () => {
    expect(source).toContain("listingId:");
    expect(source).toContain("brandId:");
    expect(source).toContain("modelId:");
    expect(source).toContain("displayPriceTmt:");
  });

  it("shows loading state while opening", () => {
    expect(source).toContain("ActivityIndicator");
    expect(source).toContain('t("openingConversation")');
  });

  it("shows shared ErrorState on failure", () => {
    expect(source).toContain("isError");
    expect(source).toContain("<ErrorState");
    expect(source).toContain("error={error}");
  });
});
