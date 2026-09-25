import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Router } from "expo-router";

import { closeAuth } from "./closeAuth";
import { useAuthIntentStore, type AuthNavigator } from "./intentStore";

function fakeRouter(canGoBack = true) {
  return {
    back: vi.fn(),
    canGoBack: vi.fn(() => canGoBack),
    dismissTo: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  } as unknown as Router;
}

describe("closeAuth", () => {
  beforeEach(() => {
    useAuthIntentStore.setState({ intent: null, replayAction: null });
  });

  it("dismisses the whole flow after switching methods", () => {
    const router = fakeRouter();
    useAuthIntentStore.getState().requireSignIn(
      router as AuthNavigator,
      { returnTo: "/(tabs)/favorites" },
      "phone",
    );

    closeAuth(router);

    expect(router.dismissTo).toHaveBeenCalledWith("/(tabs)/favorites");
    expect(router.back).not.toHaveBeenCalled();
    expect(useAuthIntentStore.getState().intent).toBeNull();
  });

  it("backs out when auth was opened without a pending intent", () => {
    const router = fakeRouter();

    closeAuth(router);

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it("falls back to Home when there is no intent or prior route", () => {
    const router = fakeRouter(false);

    closeAuth(router);

    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  });
});
