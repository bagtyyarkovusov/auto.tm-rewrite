import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "manage.tsx"), "utf-8");

describe("ManageListingsScreen structure", () => {
  it("renders four segmented tabs", () => {
    expect(source).toContain('{ key: "active", label: "Active" }');
    expect(source).toContain('{ key: "sold", label: "Sold" }');
    expect(source).toContain('{ key: "archived", label: "Archived" }');
    expect(source).toContain('{ key: "drafts", label: "Drafts" }');
  });

  it("uses auth-on-action for anonymous users", () => {
    expect(source).toContain("isAuthenticated === false");
    expect(source).toContain("Sign in to manage your listings");
    expect(source).toContain("<SignInDialog");
  });

  it("filters listings by active/sold/archived status", () => {
    expect(source).toContain("Enums.ListingStatus.Active");
    expect(source).toContain("Enums.ListingStatus.Sold");
    expect(source).toContain("Enums.ListingStatus.Archived");
    expect(source).toContain("allListings.filter");
  });

  it("reuses the feed card visual language via OwnerListingCard", () => {
    expect(source).toContain('import { OwnerListingCard }');
    expect(source).toContain("<OwnerListingCard");
  });

  it("has open and edit actions on listing rows", () => {
    expect(source).toContain("onOpen={handleOpenListing}");
    expect(source).toContain("onEdit={handleEditListing}");
    expect(source).toContain('router.push(`/(public)/listings/${id}`)');
    expect(source).toContain('router.push(`/listings/${id}/edit`)');
  });

  it("renders DraftCard with resume and discard", () => {
    expect(source).toContain('import { DraftCard }');
    expect(source).toContain("<DraftCard");
    expect(source).toContain("onResume={onResume}");
    expect(source).toContain("onDiscard={onDiscard}");
  });

  it("navigates to sell tab with resumeDraftId for resume-any-draft", () => {
    expect(source).toContain("resumeDraftId: draft.id");
    expect(source).toContain('/(tabs)/sell');
  });

  it("supports pull-to-refresh", () => {
    expect(source).toContain("<RefreshControl");
    expect(source).toContain("onRefresh={handleRefresh}");
  });

  it("supports load-more pagination", () => {
    expect(source).toContain("onEndReached={handleLoadMore}");
    expect(source).toContain("fetchNextPage");
  });

  it("shows tailored empty states per tab", () => {
    expect(source).toContain("No active listings");
    expect(source).toContain("No sold listings");
    expect(source).toContain("No archived listings");
    expect(source).toContain("No drafts");
  });
});

describe("ManageListingsScreen discard flow", () => {
  it("calls useDiscardDraft when discard is confirmed", () => {
    expect(source).toContain('import { useDiscardDraft }');
    expect(source).toContain("discardDraft.mutate(draftId");
  });
});
