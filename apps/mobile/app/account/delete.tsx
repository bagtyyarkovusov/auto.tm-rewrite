import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function DeleteAccountScreen() {
  const { t } = useTranslation("account");

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-6 pb-3 flex-row items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel={t("common:back", { defaultValue: "Back" })}
        >
          <Icon as={ChevronLeft} className="size-6 text-foreground" />
        </Button>
        <Text className="text-2xl font-semibold text-foreground">
          {t("deleteAccount")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          <Text className="text-base text-foreground">
            {t("deleteAccountDescription")}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t("common:comingSoon", { defaultValue: "Full flow coming in a future update." })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
