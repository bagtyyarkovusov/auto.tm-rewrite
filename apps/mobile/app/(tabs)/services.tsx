import { User, List, Settings } from "lucide-react-native";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const serviceItems = [
  { icon: User, label: "Profile" },
  { icon: Settings, label: "Settings" },
] as const;

export default function ServicesScreen() {
  const { t } = useTranslation(["account", "listings", "common"]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">
          {t("common:services", { defaultValue: "Services" })}
        </Text>
      </View>
      <ScrollView className="px-4">
        <Pressable
          onPress={() => router.push("/listings/manage")}
          className="mb-3 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={t("listings:myListingsAndDrafts", { defaultValue: "My listings and drafts" })}
        >
          <Card className="w-full">
            <CardContent className="flex-row items-center gap-3 py-4">
              <Icon as={List} className="size-6 text-foreground" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  {t("listings:myListingsAndDrafts", { defaultValue: "My listings & drafts" })}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {t("listings:myListingsAndDraftsDescription", { defaultValue: "Manage your active, sold, archived, and draft listings" })}
                </Text>
              </View>
            </CardContent>
          </Card>
        </Pressable>

        <View className="flex-row flex-wrap gap-3">
          {serviceItems.map((item) => {
            const isSettings = item.label === "Settings";
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  if (isSettings) {
                    router.push("/settings");
                  }
                  // Profile is wired by A1; until then it is inert but visible
                }}
                className="w-[calc(50%-6px)] active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel={t(`account:${item.label.toLowerCase()}`)}
              >
                <Card className="w-full">
                  <CardContent className="items-center gap-2 py-6">
                    <Icon as={item.icon} className="size-8 text-foreground" />
                    <Text>{t(`account:${item.label.toLowerCase()}`)}</Text>
                  </CardContent>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
