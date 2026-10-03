// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";

import { queryKeys } from "../queryKeys";

import { useUnreadCount } from "./useUnreadCount";

const mockGet = vi.fn();
const auth = vi.hoisted(() => ({
  viewer: { userId: "user-a" } as { userId: string } | null | undefined,
}));

vi.mock("../client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("../../auth/useViewer", () => ({ useViewer: () => auth.viewer }));

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("useUnreadCount", () => {
  beforeEach(() => {
    mockGet.mockReset();
    auth.viewer = { userId: "user-a" };
  });

  it("reads the total from the unread-count endpoint", async () => {
    mockGet.mockResolvedValue({ count: 3 });

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(newClient()),
    });

    await waitFor(() => expect(result.current).toBe(3));
    expect(mockGet).toHaveBeenCalledWith(
      "/conversations/unread-count",
      expect.anything(),
    );
  });

  it("is 0 and sends no request while signed out", async () => {
    auth.viewer = null;

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(newClient()),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toBe(0);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("is 0 and sends no request while the session is still loading", async () => {
    auth.viewer = undefined;

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(newClient()),
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toBe(0);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("never shows the previous User's count to the next User", async () => {
    const client = newClient();
    mockGet.mockResolvedValueOnce({ count: 5 });
    const { result, rerender } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current).toBe(5));

    let answer: (value: { count: number }) => void = () => {};
    mockGet.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    auth.viewer = { userId: "user-b" };
    rerender();

    // User B's request is still in flight: User A's 5 must not show.
    expect(result.current).toBe(0);
    await act(async () => {
      answer({ count: 2 });
    });
    await waitFor(() => expect(result.current).toBe(2));
    expect(client.getQueryData(queryKeys.conversations.unreadCount("user-a"))).toEqual({ count: 5 });
  });

  it("drops to 0 when the User signs out", async () => {
    mockGet.mockResolvedValue({ count: 4 });
    const { result, rerender } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(newClient()),
    });
    await waitFor(() => expect(result.current).toBe(4));

    auth.viewer = null;
    rerender();

    expect(result.current).toBe(0);
  });

  it("refreshes when the app comes to the foreground", async () => {
    mockGet.mockResolvedValueOnce({ count: 1 });
    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: makeWrapper(newClient()),
    });
    await waitFor(() => expect(result.current).toBe(1));

    mockGet.mockResolvedValueOnce({ count: 6 });
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(result.current).toBe(6));
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
