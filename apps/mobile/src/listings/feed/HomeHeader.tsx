import { router } from "expo-router";
import { Car, ChevronRight, Search } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useListingCount } from "../../api/listings/useListingCount";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
    <View className="gap-2">
      <View className="flex-row items-center justify-between pl-4 pr-1">
        <Text className="text-2xl font-heading text-foreground">AutoTM</Text>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full"
          onPress={() => router.push("/(tabs)/(search)/search")}
          accessibilityLabel={t("search")}
        >
          <Icon as={Search} className="size-6 text-foreground" />
        </Button>
      </View>

      <Pressable
        className="mx-4 flex-row items-center gap-3 rounded-2xl bg-secondary px-4 py-3 active:opacity-80"
        onPress={() => router.push("/(tabs)/(search)/brands")}
        accessibilityRole="button"
        accessibilityLabel={t("brandModel")}
      >
        <Icon as={Car} className="size-6 text-foreground" />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-base font-semibold text-foreground">
            {t("brandModel")}
          </Text>
          {count.data ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {t("listingsCount", {
                total: count.data.totalMatching.toLocaleString(
                  localeTag(i18n.language),
                ),
              })}
            </Text>
          ) : count.isPending ? (
            // The default skeleton colour matches the card's bg-secondary.
            <Skeleton className="my-1 h-3 w-24 bg-muted-foreground/25" />
          ) : null}
        </View>
        <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
      </Pressable>

      <View className="flex-row items-center justify-between pl-4 pr-1">
        <Text className="text-lg font-semibold text-foreground">
          {t("newListings")}
        </Text>
        <Button
          variant="ghost"
          className="h-11 px-3"
          onPress={() => router.push("/(tabs)/(search)/results")}
        >
          <Text className="text-base font-medium text-primary">{t("seeAll")}</Text>
        </Button>
      </View>
    </View>
  );
}
