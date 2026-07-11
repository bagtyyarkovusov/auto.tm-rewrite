import { router } from "expo-router";
import * as Linking from "expo-linking";
import { ChevronRight, ShieldCheck, SlidersHorizontal } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useListings } from "../../src/api/listings/useListings";
import { FeedEmpty } from "../../src/listings/feed/FeedEmpty";
import { FilteredEmpty } from "../../src/listings/feed/FilteredEmpty";
import { FeedError } from "../../src/listings/feed/FeedError";
import { FeedSkeleton } from "../../src/listings/feed/FeedSkeleton";
import { ListingCard } from "../../src/listings/feed/ListingCard";
import { FilterSheet } from "../../src/listings/search/FilterSheet";
import { useListingFilters } from "../../src/listings/search/useListingFilters";
import { useFeedCatalogMaps } from "../../src/listings/feed/useFeedCatalogMaps";

import { Badge } from "@/components/ui/badge";
import { resolveLocale } from "@/src/i18n/resources";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

function openTrustPage(locale: string) {
  void Linking.openURL(`https://auto.tm/${locale}/trust`);
}

function TrustBanner({ locale }: { locale: string }) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => openTrustPage(locale)}
      className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl bg-muted p-3 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={t("trustInfoTitle")}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon as={ShieldCheck} className="size-5 text-primary" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">
          {t("trustInfoTitle")}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={2}>
          {t("trustInfoSubtitle")}
        </Text>
      </View>
      <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
    </Pressable>
  );
}

export default function FeedScreen() {
  const { t, i18n } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const filters = useListingFilters();

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListings({ filters: filters.active });

  const handlePress = useCallback((id: string) => {
    router.push(`/(public)/listings/${id}`);
  }, []);

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];
  const catalogMaps = useFeedCatalogMaps(allItems);

  const activeFilterSummary =
    filters.count > 0
      ? t("activeFiltersCount", { count: filters.count })
      : t("filterSearchCtaHint");

  const header = (
    <View className="gap-4 px-4 pt-6 pb-4">
      <View className="gap-1">
        <Text className="text-2xl font-heading text-foreground">
          {t("carsBrowseTitle")}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {t("carsBrowseSubtitle")}
        </Text>
      </View>

      <Button
        variant="outline"
        size="lg"
        onPress={() => setSheetOpen(true)}
        accessibilityLabel={t("openFilters")}
        className="h-auto justify-between rounded-2xl border-border bg-card px-4 py-4 active:bg-muted"
      >
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
            <Icon as={SlidersHorizontal} className="size-5 text-primary" />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-base font-semibold text-foreground">
              {t("filterSearchCta")}
            </Text>
            <Text
              className="text-sm text-muted-foreground"
              numberOfLines={1}
            >
              {activeFilterSummary}
            </Text>
          </View>
        </View>

        {filters.count > 0 ? (
          <Badge variant="brand" className="ml-3">
            <Text>{filters.count}</Text>
          </Badge>
        ) : null}
      </Button>

      <TrustBanner locale={resolveLocale(i18n.language)} />
    </View>
  );

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        {header}
        <FeedSkeleton />
        <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        {header}
        <FeedError error={error} onRetry={() => refetch()} />
        <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
      </SafeAreaView>
    );
  }

  if (allItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        {header}
        {filters.count > 0 ? (
          <FilteredEmpty onReset={filters.reset} />
        ) : (
          <FeedEmpty />
        )}
        <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      {header}
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={handlePress}
            brandName={catalogMaps.brandName(item.brandId)}
            modelName={catalogMaps.modelName(item.modelId)}
            cityName={catalogMaps.cityName(item.cityId)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View className="h-px mx-4 bg-border" />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator />
            </View>
          ) : !hasNextPage ? (
            <View className="py-4 items-center">
              <Text className="text-xs text-muted-foreground">
                {t("noMore")}
              </Text>
            </View>
          ) : null
        }
      />
      <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
    </SafeAreaView>
  );
}
