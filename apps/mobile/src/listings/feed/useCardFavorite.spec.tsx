// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthIntentStore } from "../../auth/intentStore";

import { useCardFavorite } from "./useCardFavorite";

const mockPush = vi.fn();
const mockFavorite = vi.fn();
const mockUnfavorite = vi.fn();

vi.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    dismissTo: vi.fn(),
  },
}));

vi.mock("../../api/listings/useFavoriteListing", () => ({
  useFavoriteListing: () => ({ mutate: mockFavorite, isPending: false }),
}));

vi.mock("../../api/listings/useUnfavoriteListing", () => ({
  useUnfavoriteListing: () => ({ mutate: mockUnfavorite, isPending: false }),
}));

const LISTING_ID = "listing-1";
const HOME = "/(tabs)/(search)" as const;

function render(isAuthenticated: boolean | null, isFavorited = false) {
  return renderHook(() =>
    useCardFavorite({
      listingId: LISTING_ID,
      isFavorited,
      isAuthenticated,
      returnTo: HOME,
    }),
  );
}

describe("useCardFavorite", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFavorite.mockReset();
    mockUnfavorite.mockReset();
    useAuthIntentStore.setState({ intent: null, replayAction: null });
  });

  it("signed out, opens sign-in with a pending Favorite that returns to Home", () => {
    const { result } = render(false);

    act(() => result.current.toggle());

    expect(mockFavorite).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().intent).toEqual({
      returnTo: HOME,
      action: { kind: "favorite", listingId: LISTING_ID },
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/(auth)/phone" }),
    );
  });

  it("leaves a waiting Favorite to the list screen", () => {
    render(false);

    act(() => {
      useAuthIntentStore.setState({
        replayAction: { kind: "favorite", listingId: LISTING_ID },
      });
    });

    expect(mockFavorite).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().replayAction).not.toBeNull();
  });

  it("signed in, favorites optimistically and rolls back on failure", () => {
    const { result } = render(true);

    act(() => result.current.toggle());

    expect(result.current.favorited).toBe(true);
    const [, callbacks] = mockFavorite.mock.calls[0] as [string, { onError: () => void }];
    act(() => callbacks.onError());
    expect(result.current.favorited).toBe(false);
  });

  it("signed in, removes an existing Favorite", () => {
    const { result } = render(true, true);

    act(() => result.current.toggle());

    expect(mockUnfavorite).toHaveBeenCalledWith(LISTING_ID, expect.any(Object));
    expect(result.current.favorited).toBe(false);
  });

  it("ignores taps while the session is still loading", () => {
    const { result } = render(null);

    act(() => result.current.toggle());

    expect(mockFavorite).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
