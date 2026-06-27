import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { BrandLogo } from "../../src/auth/BrandLogo";
import { getOnboardingCompleted } from "../../src/onboarding/onboardingFlag";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Text } from "@/components/ui/text";

const SPLASH_DELAY_MS = 1_200;

export default function OnboardingSplashScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    void getOnboardingCompleted().then((completed) => {
      if (!mounted) return;

      if (completed) {
        router.replace("/(tabs)");
        return;
      }

      setChecking(false);
      timeoutId = setTimeout(() => {
        router.replace("/(onboarding)/language");
      }, SPLASH_DELAY_MS);
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <SafeScreen className="items-center justify-center px-6">
      <View className="items-center gap-6">
        <BrandLogo width={180} height={32} />
        {checking ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-base text-muted-foreground">AutoTM</Text>
        )}
      </View>
    </SafeScreen>
  );
}
