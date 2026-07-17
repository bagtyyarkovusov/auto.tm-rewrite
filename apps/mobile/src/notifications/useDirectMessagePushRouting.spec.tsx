// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  getLastNotificationResponse,
  addNotificationResponseReceivedListener,
  clearLastNotificationResponse,
  DEFAULT_ACTION_IDENTIFIER,
} from "expo-notifications";
import { router } from "expo-router";

import { useDirectMessagePushRouting } from "./useDirectMessagePushRouting";

type Listener = (response: unknown) => void;

let responseListener: Listener | null = null;

vi.mock("expo-notifications", () => ({
  getLastNotificationResponse: vi.fn(() => null),
  clearLastNotificationResponse: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn((listener: Listener) => {
    responseListener = listener;
    return { remove: vi.fn() };
  }),
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
}));

vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
  },
}));

const mockGetLast = vi.mocked(getLastNotificationResponse);
const mockAddListener = vi.mocked(addNotificationResponseReceivedListener);
const mockClearLast = vi.mocked(clearLastNotificationResponse);
const mockPush = vi.mocked(router.push);

function makeResponse({
  identifier = "response-1",
  actionIdentifier = DEFAULT_ACTION_IDENTIFIER,
  data,
}: {
  identifier?: string;
  actionIdentifier?: string;
  data: unknown;
}) {
  return {
    actionIdentifier,
    notification: {
      request: {
        identifier,
        content: { data },
      },
    },
  };
}

describe("useDirectMessagePushRouting", () => {
  beforeEach(() => {
    responseListener = null;
    mockGetLast.mockReset();
    mockGetLast.mockReturnValue(null);
    mockAddListener.mockClear();
    mockClearLast.mockReset();
    mockPush.mockReset();
  });

  it("routes to the conversation when a direct-message notification is tapped", () => {
    renderHook(() => useDirectMessagePushRouting());

    expect(responseListener).not.toBeNull();
    responseListener?.(
      makeResponse({ data: { conversationId: "conv-tap-1" } }),
    );

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/conversations/[id]",
      params: { id: "conv-tap-1" },
    });
  });

  it("routes a cold-start notification response and clears it", () => {
    mockGetLast.mockReturnValue(
      makeResponse({
        identifier: "cold-1",
        data: { deepLink: "/conversations/conv-cold-1" },
      }) as never,
    );

    renderHook(() => useDirectMessagePushRouting());

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/conversations/[id]",
      params: { id: "conv-cold-1" },
    });
    expect(mockClearLast).toHaveBeenCalledTimes(1);
  });

  it("does not double-route when the cold-start response is also delivered to the listener", () => {
    const response = makeResponse({
      identifier: "cold-dup",
      data: { conversationId: "conv-dup" },
    });
    mockGetLast.mockReturnValue(response as never);

    renderHook(() => useDirectMessagePushRouting());
    responseListener?.(response);

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("ignores non-default actions such as dismiss", () => {
    renderHook(() => useDirectMessagePushRouting());

    responseListener?.(
      makeResponse({
        actionIdentifier: "expo.modules.notifications.actions.DISMISS",
        data: { conversationId: "conv-dismiss" },
      }),
    );

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores notifications without a direct-message payload", () => {
    renderHook(() => useDirectMessagePushRouting());

    responseListener?.(makeResponse({ data: { url: "/listings/9" } }));
    responseListener?.(makeResponse({ data: null }));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("removes the response listener on unmount", () => {
    const { unmount } = renderHook(() => useDirectMessagePushRouting());

    const subscription = mockAddListener.mock.results[0]?.value as {
      remove: ReturnType<typeof vi.fn>;
    };
    unmount();

    expect(subscription.remove).toHaveBeenCalledTimes(1);
  });
});
