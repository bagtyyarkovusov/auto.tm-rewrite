import { useEffect, useRef } from "react";
import type { Router } from "expo-router";
import { create } from "zustand";

/**
 * Work a User asked for while signed out. Held as serializable data rather than
 * a closure so it survives the re-renders, and the screen suspensions, that
 * happen while the authentication screens sit on top of the calling screen.
 */
export type PendingAction =
  | { kind: "favorite"; listingId: string }
  | { kind: "message"; listingId: string }
  | { kind: "report"; listingId: string }
  | { kind: "inspection"; listingId: string };

export type PendingActionKind = PendingAction["kind"];

/**
 * An Expo Router typed-route href. Derived from the router itself so the store
 * cannot drift from the generated route union in `.expo/types/router.d.ts`.
 */
export type AuthHref = Parameters<Router["push"]>[0];

export interface AuthIntent {
  /** Screen the User came from, and the one authentication returns to. */
  returnTo: AuthHref;
  /** Gated work to finish on that screen once authentication succeeds. */
  action?: PendingAction;
}

/**
 * The slice of the Expo Router imperative API this flow needs. Injecting it
 * keeps the store testable without a navigation tree, and documents that the
 * flow never replaces the calling screen.
 */
export type AuthNavigator = Pick<Router, "push" | "dismissTo">;

const PHONE_ROUTE = "/(auth)/phone";
const HOME_ROUTE = "/(tabs)";

interface AuthIntentStore {
  /** Set while the User is inside the authentication screens. */
  intent: AuthIntent | null;
  /** Set once authentication succeeded, until the owning screen performs it. */
  replayAction: PendingAction | null;
  requireSignIn(navigator: AuthNavigator, intent: AuthIntent): void;
  completeSignIn(navigator: AuthNavigator): void;
  cancelSignIn(): void;
  clearReplayAction(): void;
}

export const useAuthIntentStore = create<AuthIntentStore>()((set, get) => ({
  intent: null,
  replayAction: null,

  requireSignIn(navigator, intent) {
    set({ intent, replayAction: null });
    navigator.push(PHONE_ROUTE);
  },

  completeSignIn(navigator) {
    const { intent } = get();
    set({ intent: null, replayAction: intent?.action ?? null });

    // Dismiss only the authentication screens. `dismissTo` pops back to the
    // calling screen and leaves everything under it — Results and its scroll
    // position — alive, which `replace` could not do.
    navigator.dismissTo(intent?.returnTo ?? HOME_ROUTE);
  },

  cancelSignIn() {
    // A successful sign-in consumes the intent before the authentication
    // screens unmount, so this is a no-op then and the replay survives. Only a
    // real back-out still has an intent to drop.
    if (get().intent === null) {
      return;
    }
    set({ intent: null, replayAction: null });
  },

  clearReplayAction() {
    set({ replayAction: null });
  },
}));

/**
 * Performs a pending action once, on the screen that asked for it, after the
 * User returns from authentication. The listing id is part of the match so a
 * stale action can never fire against a different Listing.
 */
export function useReplayAuthAction(
  kind: PendingActionKind,
  listingId: string | undefined,
  perform: () => void,
): void {
  const replayAction = useAuthIntentStore((state) => state.replayAction);
  const performRef = useRef(perform);

  // Declared first so the ref holds this render's callback before the replay
  // effect below runs in the same commit.
  useEffect(() => {
    performRef.current = perform;
  });

  useEffect(() => {
    if (
      replayAction === null ||
      replayAction.kind !== kind ||
      replayAction.listingId !== listingId
    ) {
      return;
    }

    // Clear before performing so a re-render cannot run the action twice.
    useAuthIntentStore.getState().clearReplayAction();
    performRef.current();
  }, [replayAction, kind, listingId]);
}
