// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { queryKeys } from "../api/queryKeys";
import { useUnreadCount } from "../api/conversations/useUnreadCount";

import { useRefreshUnreadOnPush } from "./useRefreshUnreadOnPush";

const mockGet = vi.fn();
const push = vi.hoisted(() => ({
  listener: null as null | (() => void),
  remove: vi.fn(),
}));

vi.mock("../api/client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args), post: vi.fn() },
}));
vi.mock("../auth/useViewer", () => ({
  useViewer: () => ({ userId: "user-a" }),
}));
vi.mock("expo-notifications", () => ({
  addNotificationReceivedListener: vi.fn((listener: () => void) => {
    push.listener = listener;
    return { remove: push.remove };
  }),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () => {
      useRefreshUnreadOnPush();
      return useUnreadCount();
    },
    { wrapper },
  );
  return { client, ...view };
}

describe("useRefreshUnreadOnPush", () => {
  beforeEach(() => {
    mockGet.mockReset();
    push.listener = null;
    push.remove.mockReset();
  });

  it("refetches the unread count when a push arrives while the app is open", async () => {
    mockGet.mockResolvedValueOnce({ count: 0 });
    const { result } = setup();
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    mockGet.mockResolvedValueOnce({ count: 1 });
    expect(push.listener).not.toBeNull();
    act(() => push.listener?.());

    await waitFor(() => expect(result.current).toBe(1));
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("invalidates the Conversation list too, so the rows agree with the tab", async () => {
    mockGet.mockResolvedValue({ count: 0 });
    const { client } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    act(() => push.listener?.());

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.unreadCounts(),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.list(),
    });
  });

  it("stops listening when unmounted", () => {
    mockGet.mockResolvedValue({ count: 0 });
    const { unmount } = setup();

    unmount();

    expect(push.remove).toHaveBeenCalledTimes(1);
  });
});
