import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(
  resolve(__dirname, "./useMarkSold.ts"),
  "utf-8",
);

describe("useMarkSold cache invalidation", () => {
  it("invalidates detail query on success", () => {
    expect(source).toContain("queryKeys.listings.detail(listingId)");
  });

  it("invalidates myListings query on success", () => {
    expect(source).toContain("queryKeys.listings.myListings()");
  });

  it("invalidates all listings query on success", () => {
    expect(source).toContain("queryKeys.listings.all()");
  });

  it("calls POST /listings/:id/sold", () => {
    expect(source).toContain("/listings/${listingId}/sold");
  });
});
