import { Stack, useNavigation } from "expo-router";
import { useEffect } from "react";

export default function OnboardingLayout() {
  const navigation = useNavigation();

  // The root opens this group without an animation, under the launch screen.
  // Once it is up, leaving it for Home fades like the screens inside it.
  useEffect(() => {
    navigation.setOptions({ animation: "fade" });
  }, [navigation]);

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
