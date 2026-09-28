import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { describe, expect, it } from "vitest";

import { queryKeys } from "../queryKeys";

import { setFeedFavorited } from "./setFeedFavorited";

function page(ids: string[]) {
  return {
    items: ids.map((id) => ({ id, isFavorited: false })),
    nextCursor: null,
  } as unknown as ListingsSchemas.FeedResponse;
}

describe("setFeedFavorited", () => {
  it("marks the Listing in every cached feed, anonymous or signed in", () => {
    const client = new QueryClient();
    const signedIn = queryKeys.listings.list({ limit: 20 }, "user-1");
    const filtered = queryKeys.listings.list({ brandId: "b", limit: 20 });
    client.setQueryData(signedIn, { pages: [page(["a", "b"])], pageParams: [null] });
    client.setQueryData(filtered, { pages: [page(["b"])], pageParams: [null] });

    setFeedFavorited(client, "b", true);

    const read = (key: readonly unknown[]) =>
      client
        .getQueryData<InfiniteData<ListingsSchemas.FeedResponse>>(key)
        ?.pages.flatMap((p) => p.items.map((item) => [item.id, item.isFavorited]));
    expect(read(signedIn)).toEqual([
      ["a", false],
      ["b", true],
    ]);
    expect(read(filtered)).toEqual([["b", true]]);
  });

  it("with viewerOnly, marks only signed-in feeds", () => {
    const client = new QueryClient();
    const signedIn = queryKeys.listings.list({ limit: 20 }, "user-1");
    const anonymous = queryKeys.listings.list({ limit: 20 });
    client.setQueryData(signedIn, { pages: [page(["b"])], pageParams: [null] });
    client.setQueryData(anonymous, { pages: [page(["b"])], pageParams: [null] });

    setFeedFavorited(client, "b", true, { viewerOnly: true });

    const favorited = (key: readonly unknown[]) =>
      client.getQueryData<InfiniteData<ListingsSchemas.FeedResponse>>(key)?.pages[0]?.items[0]
        ?.isFavorited;
    expect(favorited(signedIn)).toBe(true);
    expect(favorited(anonymous)).toBe(false);
  });

  it("leaves other listing queries alone", () => {
    const client = new QueryClient();
    const count = queryKeys.listings.count({});
    client.setQueryData(count, { totalMatching: 3 });

    setFeedFavorited(client, "b", true);

    expect(client.getQueryData(count)).toEqual({ totalMatching: 3 });
  });
});
