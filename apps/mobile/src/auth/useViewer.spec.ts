// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useViewer } from "./useViewer";

const mockLoadAuthSession = vi.fn();

vi.mock("./session", () => ({
  loadAuthSession: (...args: unknown[]) => mockLoadAuthSession(...args),
}));

describe("useViewer", () => {
  beforeEach(() => {
    mockLoadAuthSession.mockReset();
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
