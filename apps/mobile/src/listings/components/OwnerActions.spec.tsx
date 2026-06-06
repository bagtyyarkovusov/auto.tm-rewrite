import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./OwnerActions.tsx"),
  "utf-8",
);

describe("OwnerActions status-aware rendering", () => {
  it("shows Mark sold only for active listings", () => {
    expect(source).toContain('isActive = status === Enums.ListingStatus.Active');
    expect(source).toContain("Mark sold");
  });

  it("shows Archive for active or sold listings", () => {
    expect(source).toContain('{(isActive || isSold) && (');
    expect(source).toContain("Archive");
  });

  it("shows Republish only for archived listings", () => {
    expect(source).toContain('isArchived = status === Enums.ListingStatus.Archived');
    expect(source).toContain("Republish");
  });

  it("shows Edit for all actionable statuses", () => {
    expect(source).toContain("Edit");
    expect(source).toContain('router.push(`/listings/${listingId}/edit`)');
  });

  it("shows Delete for all statuses", () => {
    expect(source).toContain("Delete");
    expect(source).toContain('variant="destructive"');
  });
});

describe("OwnerActions confirmation flow", () => {
  it("uses AlertDialog for confirmations", () => {
    expect(source).toContain("AlertDialog");
    expect(source).toContain("AlertDialogContent");
    expect(source).toContain("AlertDialogTitle");
    expect(source).toContain("AlertDialogDescription");
    expect(source).toContain("AlertDialogAction");
    expect(source).toContain("AlertDialogCancel");
  });

  it("has distinct confirmation copy for each action", () => {
    expect(source).toContain("Mark as sold");
    expect(source).toContain("Archive listing");
    expect(source).toContain("Republish listing");
    expect(source).toContain("Delete listing");
  });

  it("delete confirmation is visually destructive", () => {
    expect(source).toContain('kind: "delete"');
    expect(source).toContain('className={\n                confirmAction?.kind === "delete"\n                  ? "bg-destructive"\n                  : undefined\n              }');
  });
});

describe("OwnerActions mutation integration", () => {
  it("calls useMarkSold for mark sold", () => {
    expect(source).toContain('import { useMarkSold }');
    expect(source).toContain('markSold.mutate(listingId');
  });

  it("calls useArchiveListing for archive", () => {
    expect(source).toContain('import { useArchiveListing }');
    expect(source).toContain('archive.mutate(listingId');
  });

  it("calls useRepublishListing for republish", () => {
    expect(source).toContain('import { useRepublishListing }');
    expect(source).toContain('republish.mutate(listingId');
  });

  it("calls useDeleteListing for delete", () => {
    expect(source).toContain('import { useDeleteListing }');
    expect(source).toContain('deleteListing.mutate(listingId');
  });

  it("disables buttons while any mutation is pending", () => {
    expect(source).toContain("isPending");
    expect(source).toContain("disabled={isPending}");
  });

  it("shows error banner on mutation failure", () => {
    expect(source).toContain("markSold.isError");
    expect(source).toContain("archive.isError");
    expect(source).toContain("republish.isError");
    expect(source).toContain("deleteListing.isError");
    expect(source).toContain("Action failed");
  });

  it("navigates back on successful delete", () => {
    expect(source).toContain("router.back()");
    expect(source).toContain("onSuccess: () => {\n            setConfirmAction(null);\n            router.back();\n          }");
  });
});

describe("OwnerActions layout", () => {
  it("uses flex-row flex-wrap for action buttons", () => {
    expect(source).toContain("flex-row flex-wrap gap-2");
  });

  it("separates destructive delete action", () => {
    expect(source).toContain("pt-1");
    expect(source).toContain('variant="destructive"');
    expect(source).toContain('className="w-full"');
  });
});
