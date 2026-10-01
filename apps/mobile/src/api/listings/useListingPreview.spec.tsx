// @vitest-environment happy-dom

import React from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { queryKeys } from "../queryKeys";
import { summaryFixture } from "../../../test/fixtures/listing";

import { findCachedListingSummary } from "./findCachedListingSummary";
import { useListingPreview } from "./useListingPreview";

const ID = "00000000-0000-4000-8000-000000000374";
const OTHER = "00000000-0000-4000-8000-000000000375";

function pages<T>(...items: T[][]): InfiniteData<{ items: T[]; nextCursor: null }> {
  return {
    pages: items.map((page) => ({ items: page, nextCursor: null })),
    pageParams: items.map(() => null),
  };
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const preview = (id: string) =>
    renderHook(() => useListingPreview(id), { wrapper }).result.current;
  return { client, preview };
}

describe("Listing detail seeds from the card the buyer tapped", () => {
  it("finds the Listing in the Home feed cache, on any loaded page", () => {
    const { client, preview } = setup();
    client.setQueryData(
      queryKeys.listings.list({ limit: 20 }, null),
      pages([summaryFixture({ id: OTHER })], [summaryFixture({ id: ID })]),
    );

    expect(preview(ID)).toMatchObject({ id: ID, displayPriceTmt: 35000 });
  });

  it("finds the Listing in a filtered Results cache for a signed-in viewer", () => {
    const { client, preview } = setup();
    client.setQueryData(
      queryKeys.listings.list({ brandId: "brand", limit: 20 }, "viewer-1"),
      pages([summaryFixture({ id: ID, isFavorited: true })]),
    );

    expect(preview(ID)).toMatchObject({ id: ID, isFavorited: true });
  });

  it("finds the Listing in the Favorites cache", () => {
    const { client, preview } = setup();
    const favorite: ListingsSchemas.FavoriteListingSummary = {
      ...summaryFixture({ id: ID }),
      allowCalls: true,
      allowChat: true,
      contactPhone: "+99361000000",
    };
    client.setQueryData(queryKeys.favorites.list(), pages([favorite]));

    expect(preview(ID)).toMatchObject({ id: ID, year: 2020 });
  });

  it("finds the Listing in the owner's My listings cache", () => {
    const { client, preview } = setup();
    client.setQueryData(
      queryKeys.listings.myListingsInfinite(),
      pages([summaryFixture({ id: ID })]),
    );

    expect(preview(ID)).toMatchObject({ id: ID });
  });

  it("has nothing for a deep link: no card was tapped, so nothing is cached", () => {
    const { client, preview } = setup();
    client.setQueryData(
      queryKeys.listings.list({ limit: 20 }, null),
      pages([summaryFixture({ id: OTHER })]),
    );
    client.setQueryData(queryKeys.listings.count({}), { total: 1 });

    expect(preview(ID)).toBeUndefined();
  });

  it("scans every cache through the same pure lookup", () => {
    const { client } = setup();
    client.setQueryData(
      queryKeys.listings.list({ limit: 20 }, null),
      pages([summaryFixture({ id: ID })]),
    );

    expect(findCachedListingSummary(client, ID)?.id).toBe(ID);
    expect(findCachedListingSummary(client, OTHER)).toBeUndefined();
  });
});
