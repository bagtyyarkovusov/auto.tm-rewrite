// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useViewer } from "./useViewer";

const mockLoadAuthSession = vi.fn();

vi.mock("./session", () => ({
  loadAuthSession: (...args: unknown[]) => mockLoadAuthSession(...args),
  subscribeAuthSession: () => () => {},
}));

let mockSnapshot: unknown;

vi.mock("./sessionSnapshot", () => ({
  peekAuthSession: () => mockSnapshot,
}));

describe("useViewer", () => {
  beforeEach(() => {
    mockLoadAuthSession.mockReset();
    mockSnapshot = undefined;
  });

  // Android recreated the Activity: the screen mounts again in the same app process.
  it("returns the viewer on its first render when the app already read the session", () => {
    mockSnapshot = { user: { id: "user-abc" } };
    mockLoadAuthSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useViewer());

    expect(result.current).toEqual({ userId: "user-abc" });
  });

  it("returns null on its first render when the app already knows there is no session", () => {
    mockSnapshot = null;
    mockLoadAuthSession.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useViewer());

    expect(result.current).toBeNull();
  });

  it("returns null when no session exists", async () => {
    mockLoadAuthSession.mockResolvedValue(null);

    const { result } = renderHook(() => useViewer());

    await waitFor(() => expect(result.current).toBe(null));
  });

  it("returns viewer with userId when session exists", async () => {
    mockLoadAuthSession.mockResolvedValue({
      accessToken: "token-123",
      refreshToken: "refresh-123",
      user: {
        id: "user-abc",
        phone: "+99361000000",
        displayName: null,
        role: "buyer",
      },
      storedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useViewer());

    await waitFor(() => expect(result.current).not.toBeUndefined());
    expect(result.current?.userId).toBe("user-abc");
  });

  it("returns undefined while loading", () => {
    mockLoadAuthSession.mockImplementation(
      () => new Promise(() => {}),
    );

    const { result } = renderHook(() => useViewer());

    expect(result.current).toBeUndefined();
  });
});
