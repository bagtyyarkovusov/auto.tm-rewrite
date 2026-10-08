import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";

import LaunchMark from "../../assets/launch-mark.svg";
import { getOnboardingCompleted } from "../../src/onboarding/onboardingFlag";
import { HOME_HREF } from "../../src/navigation/homeHref";

import { SafeScreen } from "@/components/navigation/SafeScreen";

export default function OnboardingSplashScreen() {
  const [destination, setDestination] = useState<
    typeof HOME_HREF | "/(onboarding)/language" | null
  >(null);

  useEffect(() => {
    let mounted = true;

    void getOnboardingCompleted().then((completed) => {
      if (!mounted) return;

      setDestination(completed ? HOME_HREF : "/(onboarding)/language");
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <SafeScreen className="bg-white">
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center px-6">
        <View accessibilityLabel="AutoTM" accessibilityRole="image">
          <LaunchMark width={160} height={115} />
        </View>
      </View>
    </SafeScreen>
  );
}
