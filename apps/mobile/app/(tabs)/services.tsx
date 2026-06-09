import {
  FileText,
  Info,
  List,
  Settings,
  User,
  Wrench,
} from "lucide-react-native";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const serviceItems = [
  { icon: User, labelKey: "profile" },
  { icon: Wrench, labelKey: "garage" },
  { icon: Settings, labelKey: "settings" },
  { icon: FileText, labelKey: "blog" },
  { icon: Info, labelKey: "about" },
] as const;

export default function ServicesScreen() {
  const { t } = useTranslation("account");
  const { isAuthenticated } = useAuth();

  const handleProfilePress = () => {
    if (isAuthenticated === null) return;
    if (isAuthenticated === false) {
      useAuthIntentStore.getState().setIntent({
        returnPath: "/profile",
      });
      router.push("/(auth)/phone");
      return;
    }
    router.push("/profile");
  };

  // Profile (A1) and Settings (A2) are wired; Garage/Blog/About remain inert
  // until their destinations exist (dead-tile cleanup tracked in the S8a UI sweep).
  const isInteractive = (labelKey: string) =>
    labelKey === "profile" || labelKey === "settings";

  const handlePress = (labelKey: string) => {
    if (labelKey === "profile") {
      handleProfilePress();
    } else if (labelKey === "settings") {
      router.push("/settings");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">
          {t("services")}
        </Text>
      </View>
      <ScrollView className="px-4">
        <Pressable
          onPress={() => router.push("/listings/manage")}
          className="mb-3 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={t("myListingsAndDrafts")}
        >
          <Card className="w-full">
            <CardContent className="flex-row items-center gap-3 py-4">
              <Icon as={List} className="size-6 text-foreground" />
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  {t("myListingsAndDrafts")}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {t("myListingsAndDraftsDescription")}
                </Text>
              </View>
            </CardContent>
          </Card>
        </Pressable>

        <View className="flex-row flex-wrap gap-3">
          {serviceItems.map((item) => {
            const interactive = isInteractive(item.labelKey);
            const disabled =
              !interactive ||
              (item.labelKey === "profile" && isAuthenticated === null);
            return (
              <Pressable
                key={item.labelKey}
                onPress={
                  interactive ? () => handlePress(item.labelKey) : undefined
                }
                className="w-[calc(50%-6px)] active:opacity-90"
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
                accessibilityState={{ disabled }}
                disabled={disabled}
              >
                <Card className="w-full">
                  <CardContent className="items-center gap-2 py-6">
                    <Icon as={item.icon} className="size-8 text-foreground" />
                    <Text>{t(item.labelKey)}</Text>
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
