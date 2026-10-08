import { Stack, router, useNavigation } from "expo-router";
import { useEffect } from "react";

import { loadAuthSession } from "../../src/auth/session";
import { HOME_HREF } from "../../src/navigation/homeHref";
import { readOnboardingFlag } from "../../src/onboarding/onboardingFlag";

export default function OnboardingLayout() {
  const navigation = useNavigation();

  // The root opens this group without an animation, under the launch screen.
  // Once it is up, leaving it for Home fades like the screens inside it.
  useEffect(() => {
    navigation.setOptions({ animation: "fade" });
  }, [navigation]);

  // A link can open this group after onboarding ended (or for someone signed
  // in); there Android Back would exit the app from a dead end. Redirect those
  // launches to the tabs. A read failure stays on the screen: the launch gate
  // owns the storage-failure path.
  useEffect(() => {
    void (async () => {
      const [flag, session] = await Promise.all([
        readOnboardingFlag(),
        loadAuthSession(),
      ]);
      if (flag === "completed" || session !== null) {
        router.replace(HOME_HREF);
      }
    })().catch((error: unknown) => {
      console.warn("[onboarding] could not guard the onboarding routes", error);
    });
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="language" />
      {/* The pager owns horizontal swipes, so the edge swipe does not pop the screen. */}
      <Stack.Screen name="value-prop" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
