import { router } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { setOnboardingCompleted } from "../../src/onboarding/onboardingFlag";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Text } from "@/components/ui/text";

const SLIDES = ["valueProp1", "valueProp2", "valueProp3"] as const;

function useSlides() {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  const isLast = index === SLIDES.length - 1;

  return { index, slideKey: SLIDES[index], isLast, next };
}

async function finishOnboarding() {
  await setOnboardingCompleted();
  router.replace("/(tabs)");
}

export default function ValuePropScreen() {
  const { t } = useTranslation("onboarding");
  const { index, slideKey, isLast, next } = useSlides();

  const title = t(`${slideKey}Title`);
  const body = t(`${slideKey}Body`);
  const buttonLabel = isLast
    ? t("getStarted")
    : t("common:next", { defaultValue: "Next" });

  return (
    <SafeScreen className="px-6 py-8">
      <View className="flex-1 justify-center gap-6">
        <View className="gap-3">
          {slideKey === "valueProp3" && (
            <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon as={ShieldCheck} className="size-7 text-primary" />
            </View>
          )}
          <Text className="text-3xl font-heading text-foreground">{title}</Text>
          <Text className="text-base leading-relaxed text-muted-foreground">
            {body}
          </Text>
        </View>
      </View>

      <View className="gap-4">
        <View className="flex-row justify-center gap-2">
          {SLIDES.map((key, i) => (
            <View
              key={key}
              className={cn(
                "h-1.5 rounded-full",
                i === index
                  ? "w-6 bg-foreground"
                  : "w-1.5 bg-muted-foreground/40",
              )}
              accessibilityRole="progressbar"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`${i + 1} of ${SLIDES.length}`}
            />
          ))}
        </View>

        <Button
          variant="brand"
          size="pill"
          onPress={isLast ? finishOnboarding : next}
          accessibilityLabel={buttonLabel}
        >
          <Text>{buttonLabel}</Text>
        </Button>

        <Pressable
          onPress={finishOnboarding}
          accessibilityRole="button"
          accessibilityLabel={t("common:skip", { defaultValue: "Skip" })}
          className="items-center justify-center min-h-[44px] active:opacity-70"
        >
          <Text className="text-sm text-muted-foreground">
            {t("common:skip", { defaultValue: "Skip" })}
          </Text>
        </Pressable>
      </View>
    </SafeScreen>
  );
}
