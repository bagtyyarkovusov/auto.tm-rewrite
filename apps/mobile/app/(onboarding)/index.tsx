import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";

import LaunchMark from "../../assets/launch-mark.svg";
import { getOnboardingCompleted } from "../../src/onboarding/onboardingFlag";

import { SafeScreen } from "@/components/navigation/SafeScreen";

export default function OnboardingSplashScreen() {
  const [destination, setDestination] = useState<
    "/(tabs)" | "/(onboarding)/language" | null
  >(null);

  useEffect(() => {
    let mounted = true;

    void getOnboardingCompleted().then((completed) => {
      if (!mounted) return;

      setDestination(completed ? "/(tabs)" : "/(onboarding)/language");
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <SafeScreen className="items-center justify-center bg-white px-6">
      <StatusBar style="dark" />
      <View accessibilityLabel="AutoTM" accessibilityRole="image">
        <LaunchMark width={160} height={115} />
      </View>
    </SafeScreen>
  );
}
