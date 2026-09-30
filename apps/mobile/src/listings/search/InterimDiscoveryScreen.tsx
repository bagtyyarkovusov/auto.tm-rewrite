import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useSafeBack } from "../../navigation/useSafeBack";
import { HOME_HREF } from "../../navigation/homeHref";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface InterimDiscoveryScreenProps {
  title: string;
}

/**
 * Stand-in for a Search-tab screen whose own slice has not landed yet
 * (Search in #369). It keeps Home's entries routable and offers the full feed
 * meanwhile.
 */
export function InterimDiscoveryScreen({ title }: InterimDiscoveryScreenProps) {
  const { t } = useTranslation();
  const goBack = useSafeBack(HOME_HREF);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-row items-center gap-1 px-1 pt-2 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onPress={goBack}
          accessibilityLabel={t("back")}
        >
          <Icon as={ChevronLeft} className="size-6 text-foreground" />
        </Button>
        <Text className="text-2xl font-heading text-foreground">{title}</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-base text-muted-foreground">
          {t("comingSoon")}
        </Text>
        <Button
          variant="outline"
          onPress={() => router.replace("/(tabs)/(search)/results")}
        >
          <Text>{t("seeAll")}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
