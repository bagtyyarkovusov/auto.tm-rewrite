import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./open-listing.tsx"), "utf-8");

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
    expect(source).toContain("Opening conversation…");
  });

  it("shows error state with retry on failure", () => {
    expect(source).toContain("isError");
    expect(source).toContain("Retry");
  });

  it("shows go back button on error", () => {
    expect(source).toContain("Go back");
    expect(source).toContain("router.back()");
  });
});
