import { readFileSync } from "fs";
import { resolve } from "path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useAuthIntentStore,
  type AuthNavigator,
  type PendingAction,
} from "./intentStore";

function fakeNavigator() {
  return { push: vi.fn(), dismissTo: vi.fn() } satisfies AuthNavigator;
}

const LISTING_ID = "listing-abc";
const LISTING_ROUTE = `/(public)/listings/${LISTING_ID}` as const;

describe("useAuthIntentStore", () => {
  beforeEach(() => {
    useAuthIntentStore.setState({ intent: null, replayAction: null });
  });

  it("opens authentication without a replay waiting", () => {
    const navigator = fakeNavigator();

    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: LISTING_ROUTE,
      action: { kind: "favorite", listingId: LISTING_ID },
    });

    expect(navigator.push).toHaveBeenCalledWith({
      pathname: "/(auth)/phone",
      params: { authRoot: "1" },
    });
    expect(useAuthIntentStore.getState().intent).toEqual({
      returnTo: LISTING_ROUTE,
      action: { kind: "favorite", listingId: LISTING_ID },
    });
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
  });

  it("opens email as an equal sign-in entry while keeping the same intent", () => {
    const navigator = fakeNavigator();

    useAuthIntentStore.getState().requireSignIn(
      navigator,
      { returnTo: "/(tabs)/favorites" },
      "email",
    );

    expect(navigator.push).toHaveBeenCalledWith({
      pathname: "/(auth)/email",
      params: { authRoot: "1" },
    });
    expect(useAuthIntentStore.getState().intent).toEqual({
      returnTo: "/(tabs)/favorites",
    });
  });

  it("keeps the pending action serializable", () => {
    const navigator = fakeNavigator();

    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: LISTING_ROUTE,
      action: { kind: "message", listingId: LISTING_ID },
    });

    const { intent } = useAuthIntentStore.getState();
    expect(JSON.parse(JSON.stringify(intent))).toEqual(intent);
  });

  const actions: PendingAction[] = [
    { kind: "favorite", listingId: LISTING_ID },
    { kind: "message", listingId: LISTING_ID },
    { kind: "report", listingId: LISTING_ID },
    { kind: "inspection", listingId: LISTING_ID },
  ];

  it.each(actions)(
    "returns to the calling Listing and hands back the $kind action",
    (action) => {
      const navigator = fakeNavigator();
      useAuthIntentStore
        .getState()
        .requireSignIn(navigator, { returnTo: LISTING_ROUTE, action });

      useAuthIntentStore.getState().completeSignIn(navigator);

      expect(navigator.dismissTo).toHaveBeenCalledWith(LISTING_ROUTE);
      expect(useAuthIntentStore.getState().replayAction).toEqual(action);
      expect(useAuthIntentStore.getState().intent).toBeNull();
    },
  );

  it("finishes on the tab that started a sign-in with no pending action", () => {
    const navigator = fakeNavigator();
    useAuthIntentStore
      .getState()
      .requireSignIn(navigator, { returnTo: "/(tabs)/favorites" });

    useAuthIntentStore.getState().completeSignIn(navigator);

    expect(navigator.dismissTo).toHaveBeenCalledWith("/(tabs)/favorites");
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
  });

  it("falls back to the tabs root when nothing recorded a return screen", () => {
    const navigator = fakeNavigator();

    useAuthIntentStore.getState().completeSignIn(navigator);

    expect(navigator.dismissTo).toHaveBeenCalledWith("/(tabs)");
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
  });

  it("drops the pending action when authentication is cancelled", () => {
    const navigator = fakeNavigator();
    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: LISTING_ROUTE,
      action: { kind: "favorite", listingId: LISTING_ID },
    });

    useAuthIntentStore.getState().cancelSignIn();

    expect(useAuthIntentStore.getState().intent).toBeNull();
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
    expect(navigator.dismissTo).not.toHaveBeenCalled();
  });

  it("cancels from OTP and dismisses the whole auth flow to the caller", () => {
    const navigator = fakeNavigator();
    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: LISTING_ROUTE,
      action: { kind: "report", listingId: LISTING_ID },
    });

    useAuthIntentStore.getState().cancelSignIn(navigator);

    expect(navigator.dismissTo).toHaveBeenCalledWith(LISTING_ROUTE);
    expect(useAuthIntentStore.getState().intent).toBeNull();
    expect(useAuthIntentStore.getState().replayAction).toBeNull();
  });

  // The authentication screens cancel on unmount, which also runs right after a
  // successful sign-in dismissed them. That must not eat the replay.
  it("leaves a completed replay alone when the auth screens unmount", () => {
    const navigator = fakeNavigator();
    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: LISTING_ROUTE,
      action: { kind: "favorite", listingId: LISTING_ID },
    });
    useAuthIntentStore.getState().completeSignIn(navigator);

    useAuthIntentStore.getState().cancelSignIn();

    expect(useAuthIntentStore.getState().replayAction).toEqual({
      kind: "favorite",
      listingId: LISTING_ID,
    });
  });

  it("starting a second gated action replaces the first", () => {
    const navigator = fakeNavigator();
    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: LISTING_ROUTE,
      action: { kind: "favorite", listingId: LISTING_ID },
    });

    useAuthIntentStore.getState().requireSignIn(navigator, {
      returnTo: "/(public)/listings/other",
      action: { kind: "report", listingId: "other" },
    });
    useAuthIntentStore.getState().completeSignIn(navigator);

    expect(navigator.dismissTo).toHaveBeenCalledWith("/(public)/listings/other");
    expect(useAuthIntentStore.getState().replayAction).toEqual({
      kind: "report",
      listingId: "other",
    });
  });
});

describe("auth intent return mechanism", () => {
  const storeSource = readFileSync(resolve(__dirname, "./intentStore.ts"), "utf-8");
  const otpSource = readFileSync(
    resolve(__dirname, "../../app/(auth)/otp.tsx"),
    "utf-8",
  );

  it("returns by dismissing the auth screens, never by replacing the caller", () => {
    expect(storeSource).toContain("dismissTo");
    expect(storeSource).not.toContain("replace(");
    expect(storeSource).not.toContain("dismissAll");
  });

  it("the OTP screen finishes through completeSignIn", () => {
    expect(otpSource).toContain("authNavigation.complete()");
    expect(otpSource).not.toContain("consumeAndReplay");
    expect(otpSource).not.toContain("router.dismissAll()");
  });

  it("the OTP back button cancels while changing the identifier pops to its entry screen", () => {
    expect(otpSource).toContain("authNavigation.cancel()");
    expect(otpSource).toContain("authNavigation.changeMethod()");
    expect(otpSource).not.toContain('pathname: "/(auth)/phone"');
  });

  it("the phone screen cancels an abandoned sign-in", () => {
    const phoneSource = readFileSync(
      resolve(__dirname, "../../app/(auth)/phone.tsx"),
      "utf-8",
    );
    expect(phoneSource).toContain("useAuthIntentStore.getState().cancelSignIn()");
  });

  it("the email screen cancels an abandoned root sign-in", () => {
    const emailSource = readFileSync(
      resolve(__dirname, "../../app/(auth)/email.tsx"),
      "utf-8",
    );
    expect(emailSource).toContain("useAuthIntentStore.getState().cancelSignIn()");
  });
});
