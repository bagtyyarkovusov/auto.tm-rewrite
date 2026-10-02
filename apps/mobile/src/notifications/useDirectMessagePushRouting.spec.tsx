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

const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("expo-router", () => ({
  router: {
    push: vi.fn(),
    dismissTo: vi.fn(),
  },
  usePathname: () => nav.pathname,
}));

const mockGetLast = vi.mocked(getLastNotificationResponse);
const mockAddListener = vi.mocked(addNotificationResponseReceivedListener);
const mockClearLast = vi.mocked(clearLastNotificationResponse);
const mockPush = vi.mocked(router.push);
const mockDismissTo = vi.mocked(router.dismissTo);

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
    mockDismissTo.mockReset();
    nav.pathname = "/";
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

/**
 * A model of the root Stack, enough to read the back stack a push tap leaves.
 * `dismissTo` follows React Navigation's POP_TO, which Expo Router dispatches
 * for it: pop to the nearest route with that name and set its params (here the
 * selected tab), or replace the top route when none is in the stack.
 */
type StackRoute =
  | { name: "(onboarding)" }
  | { name: "(tabs)"; tab: string }
  | { name: "listing" }
  | { name: "conversation"; id: string };

function modelRootStack(initial: StackRoute[]) {
  const routes = [...initial];
  const toRoute = (href: unknown): StackRoute => {
    if (typeof href === "string" && href.startsWith("/(tabs)/")) {
      return { name: "(tabs)", tab: href.slice("/(tabs)/".length) };
    }
    const { pathname, params } = href as { pathname: string; params: { id: string } };
    if (pathname === "/conversations/[id]") {
      return { name: "conversation", id: params.id };
    }
    throw new Error(`Unmodelled href ${String(pathname)}`);
  };
  mockPush.mockImplementation((href) => {
    routes.push(toRoute(href));
  });
  mockDismissTo.mockImplementation((href) => {
    const target = toRoute(href);
    const index = routes.map((route) => route.name).lastIndexOf(target.name);
    if (index === -1) {
      routes.splice(routes.length - 1, 1, target);
    } else {
      routes.splice(index, routes.length - index, target);
    }
  });
  return {
    routes,
    /** Back, and the Android back gesture, pop the root Stack. */
    back() {
      routes.pop();
      return routes[routes.length - 1];
    },
  };
}

describe("Back after a push tap", () => {
  const tabsOn = (tab: string): StackRoute => ({ name: "(tabs)", tab });

  beforeEach(() => {
    responseListener = null;
    mockGetLast.mockReset();
    mockGetLast.mockReturnValue(null);
    mockPush.mockReset();
    mockDismissTo.mockReset();
    nav.pathname = "/";
  });

  it("goes to the Messages list when tapped on Listing detail in another tab (foreground)", () => {
    nav.pathname = "/listings/9";
    const stack = modelRootStack([tabsOn("(search)"), { name: "listing" }]);
    renderHook(() => useDirectMessagePushRouting());

    responseListener?.(makeResponse({ data: { conversationId: "conv-fg" } }));

    expect(stack.routes.at(-1)).toEqual({ name: "conversation", id: "conv-fg" });
    expect(stack.back()).toEqual(tabsOn("chat"));
    // A second Back leaves the tabs; it never returns to the Conversation.
    stack.back();
    expect(stack.routes).not.toContainEqual(expect.objectContaining({ name: "conversation" }));
  });

  it("goes to the Messages list when tapped from the background on another tab", () => {
    nav.pathname = "/favorites";
    const stack = modelRootStack([tabsOn("favorites")]);
    renderHook(() => useDirectMessagePushRouting());

    responseListener?.(makeResponse({ data: { conversationId: "conv-bg" } }));

    expect(stack.routes).toEqual([tabsOn("chat"), { name: "conversation", id: "conv-bg" }]);
    expect(stack.back()).toEqual(tabsOn("chat"));
  });

  it("goes to the Messages list after a cold start", () => {
    mockGetLast.mockReturnValue(
      makeResponse({ identifier: "cold", data: { conversationId: "conv-cold" } }) as never,
    );
    const stack = modelRootStack([{ name: "(onboarding)" }]);

    renderHook(() => useDirectMessagePushRouting());

    expect(stack.routes).toEqual([tabsOn("chat"), { name: "conversation", id: "conv-cold" }]);
    expect(stack.back()).toEqual(tabsOn("chat"));
  });

  it("replaces another open Conversation instead of stacking on it", () => {
    nav.pathname = "/conversations/conv-a";
    const stack = modelRootStack([tabsOn("chat"), { name: "conversation", id: "conv-a" }]);
    renderHook(() => useDirectMessagePushRouting());

    responseListener?.(makeResponse({ data: { conversationId: "conv-b" } }));

    expect(stack.routes).toEqual([tabsOn("chat"), { name: "conversation", id: "conv-b" }]);
  });

  it("does not stack a second copy of the Conversation already on screen", () => {
    nav.pathname = "/conversations/conv-open";
    const stack = modelRootStack([tabsOn("chat"), { name: "conversation", id: "conv-open" }]);
    renderHook(() => useDirectMessagePushRouting());

    responseListener?.(makeResponse({ identifier: "a", data: { conversationId: "conv-open" } }));
    responseListener?.(makeResponse({ identifier: "b", data: { conversationId: "conv-open" } }));

    expect(stack.routes).toEqual([tabsOn("chat"), { name: "conversation", id: "conv-open" }]);
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
