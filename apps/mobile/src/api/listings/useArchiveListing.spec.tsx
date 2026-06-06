import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./useArchiveListing.ts"),
  "utf-8",
);

describe("useArchiveListing cache invalidation", () => {
  it("invalidates detail query on success", () => {
    expect(source).toContain("queryKeys.listings.detail(listingId)");
  });

  it("invalidates myListings query on success", () => {
    expect(source).toContain("queryKeys.listings.myListings()");
  });

  it("invalidates all listings query on success", () => {
    expect(source).toContain("queryKeys.listings.all()");
  });

  it("calls POST /listings/:id/archive", () => {
    expect(source).toContain("/listings/${listingId}/archive");
  });
});
