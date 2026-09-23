// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthIntentStore, useReplayAuthAction } from "./intentStore";

const LISTING_ID = "listing-abc";

describe("useReplayAuthAction", () => {
  beforeEach(() => {
    useAuthIntentStore.setState({ intent: null, replayAction: null });
  });

  it("performs a matching action once and clears it", () => {
    const perform = vi.fn();
    renderHook(() => useReplayAuthAction("favorite", LISTING_ID, perform));

    expect(perform).not.toHaveBeenCalled();

    act(() => {
      useAuthIntentStore.setState({
        replayAction: { kind: "favorite", listingId: LISTING_ID },
      });
    });

    expect(perform).toHaveBeenCalledTimes(1);
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
  });

  it("ignores an action for another kind", () => {
    const perform = vi.fn();
    renderHook(() => useReplayAuthAction("favorite", LISTING_ID, perform));

    act(() => {
      useAuthIntentStore.setState({
        replayAction: { kind: "report", listingId: LISTING_ID },
      });
    });

    expect(perform).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().replayAction).not.toBeNull();
  });

  it("ignores an action for another Listing", () => {
    const perform = vi.fn();
    renderHook(() => useReplayAuthAction("favorite", LISTING_ID, perform));

    act(() => {
      useAuthIntentStore.setState({
        replayAction: { kind: "favorite", listingId: "other-listing" },
      });
    });

    expect(perform).not.toHaveBeenCalled();
  });

  // The callers pass fresh inline closures on every render, so the hook has to
  // run the newest one rather than the one captured on mount.
  it("runs the latest callback, not the one from mount", () => {
    const stale = vi.fn();
    const fresh = vi.fn();
    const { rerender } = renderHook(
      ({ perform }: { perform: () => void }) =>
        useReplayAuthAction("message", LISTING_ID, perform),
      { initialProps: { perform: stale } },
    );

    rerender({ perform: fresh });

    act(() => {
      useAuthIntentStore.setState({
        replayAction: { kind: "message", listingId: LISTING_ID },
      });
    });

    expect(stale).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
