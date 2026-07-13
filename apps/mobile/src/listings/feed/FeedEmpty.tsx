import { View } from "react-native";
import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function FeedEmpty() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6 gap-5">
      <View className="size-16 items-center justify-center rounded-full bg-muted">
        <Icon as={Search} className="size-8 text-muted-foreground" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-lg font-semibold text-foreground">
          {t("noListings")}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {t("beFirstToSell")}
        </Text>
      </View>
      <Button
        variant="brand"
        size="pill"
        onPress={() => router.push("/(tabs)/sell")}
      >
        <Text className="text-primary-foreground">{t("sellCar")}</Text>
      </Button>
    </View>
  );
}
