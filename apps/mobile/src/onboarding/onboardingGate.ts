import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadAuthSession } from "../auth/session";

import {
  ONBOARDING_KEY,
  readOnboardingFlag,
  setOnboardingCompleted,
  setOnboardingPending,
} from "./onboardingFlag";

export type OnboardingDecision = "show" | "skip";

/** The longest a launch waits for storage before it opens Home without onboarding. */
export const ONBOARDING_GATE_TIMEOUT_MS = 1000;

async function hasSession(): Promise<boolean> {
  try {
    return (await loadAuthSession()) !== null;
  } catch {
    return false;
  }
}

/** A failed write never changes what this launch shows. */
async function store(write: () => Promise<void>): Promise<void> {
  try {
    await write();
  } catch (error) {
    console.warn("[onboarding] could not store the onboarding flag", error);
  }
}

/**
 * Decides whether this launch owes the person onboarding.
 *
 * A fresh install has no flag, nothing else in storage and no session: it is
 * marked `pending` and sees onboarding until it finishes or skips. Someone who
 * already used the app has a session or something stored (a chosen language or
 * theme, a recent search, the notification prompt), so an update marks them
 * `completed` without showing anything. The app stores a language only when
 * the person picks one, so the language alone would miss most of them.
 *
 * Both storage reads start in the same tick as the call, and the root layout
 * calls this first, before anything in this launch can write to storage.
 */
async function decide(): Promise<OnboardingDecision> {
  const [flag, keys] = await Promise.all([
    readOnboardingFlag(),
    AsyncStorage.getAllKeys(),
  ]);

  if (flag === "completed") return "skip";

  if (flag === null && keys.some((key) => key !== ONBOARDING_KEY)) {
    await store(setOnboardingCompleted);
    return "skip";
  }

  if (await hasSession()) {
    await store(setOnboardingCompleted);
    return "skip";
  }

  if (flag === null) await store(setOnboardingPending);
  return "show";
}

/**
 * The launch gate. Resolves `skip` when storage fails or takes longer than
 * `timeoutMs`, so a slow device opens Home instead of waiting. A late decision
 * is still stored, so the next cold start can act on it.
 */
export function resolveOnboardingGate(
  timeoutMs = ONBOARDING_GATE_TIMEOUT_MS,
): Promise<OnboardingDecision> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn("[onboarding] storage was slow; opening Home without onboarding");
      resolve("skip");
    }, timeoutMs);

    void decide()
      .catch((error: unknown): OnboardingDecision => {
        console.warn("[onboarding] could not read the onboarding state", error);
        return "skip";
      })
      .then((decision) => {
        clearTimeout(timer);
        resolve(decision);
      });
  });
}
