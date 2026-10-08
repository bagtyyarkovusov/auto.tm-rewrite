import { router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";

import type { OnboardingDecision } from "./onboardingGate";

/** Home's path. A cold start anywhere else came from a link, and the link wins. */
const HOME_PATHNAME = "/";
/** If the Language screen never mounts, the launch screen still goes away. */
const SPLASH_FALLBACK_MS = 1000;

/**
 * Opens onboarding above the tabs on a launch that owes it, then lets the
 * launch screen go. Render it beside the root Stack, once the gate has decided.
 *
 * The tabs stay the first route, so Home is underneath and nothing can go Back
 * to onboarding after it ends. The Language screen hides the launch screen
 * itself when it mounts, so Home is not seen first.
 */
export function OnboardingLaunch({ decision }: { decision: OnboardingDecision }) {
  const pathname = usePathname();
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    settled.current = true;

    if (decision === "show" && pathname === HOME_PATHNAME) {
      // The fallback is armed before the push: a push that throws still lets
      // the launch screen go, and unmounting cancels the timer.
      const fallback = setTimeout(() => SplashScreen.hide(), SPLASH_FALLBACK_MS);
      try {
        router.push("/(onboarding)/language");
      } catch (error) {
        clearTimeout(fallback);
        console.warn("[onboarding] could not open the Language screen", error);
        SplashScreen.hide();
        return;
      }
      return () => clearTimeout(fallback);
    }
    SplashScreen.hide();
  }, [decision, pathname]);

  return null;
}
