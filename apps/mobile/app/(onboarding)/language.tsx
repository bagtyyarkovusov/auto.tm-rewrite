import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";

import { Button } from "@/components/ui/button";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Text } from "@/components/ui/text";

export default function LanguagePickerScreen() {
  const { t } = useTranslation("onboarding");
  const continueLabel = t("common:continue", { defaultValue: "Continue" });

  return (
    <SafeScreen className="px-6 py-8">
      <View className="flex-1 justify-center gap-8">
        <View className="gap-3">
          <Text className="text-3xl font-heading text-foreground">
            {t("chooseLanguage")}
          </Text>
          <Text className="text-base text-muted-foreground">
            {t("languageSubtitle")}
          </Text>
        </View>

        <LocaleSwitcher />
      </View>

      <Button
        variant="brand"
        size="pill"
        onPress={() => router.push("/(onboarding)/value-prop")}
        accessibilityLabel={continueLabel}
      >
        <Text>{continueLabel}</Text>
      </Button>
    </SafeScreen>
  );
}
