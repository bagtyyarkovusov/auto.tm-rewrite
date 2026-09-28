// @vitest-environment happy-dom

import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "../../api/queryKeys";
import { useAuthIntentStore } from "../../auth/intentStore";
import { HOME_HREF } from "../../navigation/homeHref";

import { useFeedFavoriteReplay } from "./useFeedFavoriteReplay";

const mockFavorite = vi.fn();
let focused = true;

vi.mock("expo-router", () => ({
  useIsFocused: () => focused,
}));

vi.mock("../../api/listings/useFavoriteListing", () => ({
  useFavoriteListing: () => ({ mutate: mockFavorite, isPending: false }),
}));

type FeedPages = InfiniteData<ListingsSchemas.FeedResponse>;

function page(ids: string[]): ListingsSchemas.FeedResponse {
  return {
    items: ids.map((id) => ({ id, isFavorited: false })),
    nextCursor: null,
  } as unknown as ListingsSchemas.FeedResponse;
}

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { rerender } = renderHook(() => useFeedFavoriteReplay(HOME_HREF), { wrapper });
  return { client, rerender };
}

function hand(listingId: string, returnTo: string = HOME_HREF) {
  act(() => {
    useAuthIntentStore.setState({
      replayAction: { kind: "favorite", listingId },
      replayReturnTo: returnTo as typeof HOME_HREF,
    });
  });
}

describe("useFeedFavoriteReplay", () => {
  beforeEach(() => {
    mockFavorite.mockReset();
    focused = true;
    useAuthIntentStore.setState({ intent: null, replayAction: null, replayReturnTo: null });
  });

  it("finishes a Favorite for a Listing that was only on page 2", () => {
    const { client } = setup();
    // After sign-in the viewer's feed holds only its first page.
    const signedIn = queryKeys.listings.list({ limit: 20 }, "user-1");
    client.setQueryData<FeedPages>(signedIn, { pages: [page(["p1-a", "p1-b"])], pageParams: [null] });

    hand("p2-listing");

    expect(mockFavorite).toHaveBeenCalledTimes(1);
    expect(mockFavorite).toHaveBeenCalledWith("p2-listing", expect.any(Object));
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
  });

  it("shows the ♥ in cached feeds at once and rolls it back on failure", () => {
    const { client } = setup();
    const anonymous = queryKeys.listings.list({ limit: 20 });
    client.setQueryData<FeedPages>(anonymous, {
      pages: [page(["p1-a"]), page(["p2-listing"])],
      pageParams: [null, "c1"],
    });

    hand("p2-listing");

    const favorited = () =>
      client
        .getQueryData<FeedPages>(anonymous)
        ?.pages.flatMap((p) => p.items)
        .find((item) => item.id === "p2-listing")?.isFavorited;
    expect(favorited()).toBe(true);

    const [, callbacks] = mockFavorite.mock.calls[0] as [string, { onError: () => void }];
    act(() => callbacks.onError());
    expect(favorited()).toBe(false);
  });

  it("leaves the action alone while the screen is not focused", () => {
    focused = false;
    setup();

    hand("listing-1");

    expect(mockFavorite).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().replayAction).toEqual({
      kind: "favorite",
      listingId: "listing-1",
    });
  });

  it("ignores other waiting actions", () => {
    setup();

    act(() => {
      useAuthIntentStore.setState({
        replayAction: { kind: "message", listingId: "listing-1" },
        replayReturnTo: HOME_HREF,
      });
    });

    expect(mockFavorite).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().replayAction).not.toBeNull();
  });

  it("finishes the Favorite once when the screen regains focus after sign-in", () => {
    focused = false;
    const { rerender } = setup();

    // completeSignIn sets the action while the auth screens cover Home.
    hand("p2");
    expect(mockFavorite).not.toHaveBeenCalled();

    focused = true;
    rerender();
    expect(mockFavorite).toHaveBeenCalledTimes(1);
    expect(mockFavorite).toHaveBeenCalledWith("p2", expect.any(Object));
    expect(useAuthIntentStore.getState().replayAction).toBeNull();

    rerender();
    expect(mockFavorite).toHaveBeenCalledTimes(1);
  });

  it("leaves a Favorite that another screen asked for", () => {
    setup();

    hand("own-listing", "/(public)/listings/own-listing");

    expect(mockFavorite).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().replayAction).not.toBeNull();
  });

  it("refetches the feeds once the Favorite is saved", () => {
    const { client } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    hand("listing-1");

    const [, callbacks] = mockFavorite.mock.calls[0] as [string, { onSuccess: () => void }];
    act(() => callbacks.onSuccess());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.listings.lists() });
  });
});
