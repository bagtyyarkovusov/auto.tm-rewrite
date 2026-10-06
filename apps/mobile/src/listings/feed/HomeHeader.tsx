import { router } from "expo-router";
import { Car, ChevronRight, Search } from "lucide-react-native";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { useListingCount } from "../../api/listings/useListingCount";
import { BrandLogo } from "../../auth/BrandLogo";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/navigation/ScreenHeader";
import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { localeTag } from "@/src/i18n/resources";

/**
 * Home's header above the New listings grid: the AutoTM title with 🔍 (opens
 * Search), the "Brand, model" card with the live Listing count (opens the
 * Brand picker), and the New listings heading with See all (opens Results).
 */
export function HomeHeader() {
  const { t, i18n } = useTranslation();
  const count = useListingCount({});

  return (
    <View className="gap-4 pb-1">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="h-11 justify-center">
          <BrandLogo width={136} height={24} />
        </View>
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11"
          onPress={() => router.push("/(tabs)/(search)/search")}
          accessibilityLabel={t("search")}
        >
          <Icon as={Search} className="size-5 text-foreground" strokeWidth={2.2} />
        </Button>
      </View>

      <PressableScale
        feedback="surface"
        className="mx-4 flex-row items-center gap-3.5 rounded-3xl bg-card p-4 active:bg-secondary"
        onPress={() => router.push("/(tabs)/(search)/brands")}
        accessibilityRole="button"
        accessibilityLabel={t("brandModel")}
      >
        <View className="size-12 items-center justify-center rounded-full bg-secondary">
          <Icon as={Car} className="size-6 text-foreground" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-heading text-subhead font-semibold text-foreground">
            {t("brandModel")}
          </Text>
          {count.data ? (
            <Text className="text-callout text-muted-foreground" numberOfLines={1}>
              {t("listingsCount", {
                total: count.data.totalMatching.toLocaleString(
                  localeTag(i18n.language),
                ),
              })}
            </Text>
          ) : count.isPending ? (
            <Skeleton className="my-1 h-3 w-24" />
          ) : null}
        </View>
        <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
      </PressableScale>

      <SectionHeader
        title={t("newListings")}
        className="pr-2"
        trailing={
          <Button
            variant="ghost"
            className="h-11 px-3"
            onPress={() => router.push("/(tabs)/(search)/results")}
          >
            <Text className="text-body font-medium text-primary">{t("seeAll")}</Text>
          </Button>
        }
      />
    </View>
  );
}
