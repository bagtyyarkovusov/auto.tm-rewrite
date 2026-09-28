import { router } from "expo-router";
import { Car, ChevronRight, Search } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useListingCount } from "../../../src/api/listings/useListingCount";
import { useListings } from "../../../src/api/listings/useListings";
import type { AuthHref } from "../../../src/auth/intentStore";
import { useViewer } from "../../../src/auth/useViewer";
import { FeedEmpty } from "../../../src/listings/feed/FeedEmpty";
import { FeedError } from "../../../src/listings/feed/FeedError";
import {
  ListingGridCard,
  ListingGridCardSkeleton,
} from "../../../src/listings/feed/ListingGridCard";
import { useFeedCatalogMaps } from "../../../src/listings/feed/useFeedCatalogMaps";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { localeTag } from "@/src/i18n/resources";

const HOME_HREF: AuthHref = "/(tabs)/(search)";
const SKELETON_ROWS = [0, 1, 2];

function HomeHeader() {
  const { t, i18n } = useTranslation();
  const count = useListingCount({});

  return (
    <View className="gap-3 pb-3">
      <View className="flex-row items-center justify-between pl-4 pr-1">
        <Text className="text-2xl font-heading text-foreground">AutoTM</Text>
        <Pressable
          className="h-12 w-12 items-center justify-center rounded-full active:bg-muted"
          onPress={() => router.push("/(tabs)/(search)/search")}
          accessibilityRole="button"
          accessibilityLabel={t("search")}
        >
          <Icon as={Search} className="size-6 text-foreground" />
        </Pressable>
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
            <Skeleton className="my-1 h-3 w-24" />
          ) : null}
        </View>
        <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
      </Pressable>

      <View className="flex-row items-center justify-between pl-4 pr-1">
        <Text className="text-lg font-semibold text-foreground">
          {t("newListings")}
        </Text>
        <Pressable
          className="h-11 justify-center px-3 active:opacity-70"
          onPress={() => router.push("/(tabs)/(search)/results")}
          accessibilityRole="button"
        >
          <Text className="text-base font-medium text-primary">{t("seeAll")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GridSkeleton() {
  return (
    <View className="gap-4 px-4">
      {SKELETON_ROWS.map((row) => (
        <View key={row} className="flex-row gap-3">
          <ListingGridCardSkeleton />
          <ListingGridCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/**
 * Home, the Search tab's first screen (33 — Search & discovery; ADR-0051):
 * 🔍 opens Search, the "Brand, model" card opens the Brand picker, and New
 * listings is the chronological feed as a two-column grid. There are no
 * filters and no safety banner here.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const viewer = useViewer();
  const isAuthenticated = viewer === undefined ? null : viewer !== null;

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
  } = useListings({
    viewerId: viewer?.userId ?? null,
    // Wait for the session check so a signed-in User's first page already
    // carries `isFavorited` instead of refetching straight after.
    enabled: viewer !== undefined,
  });

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const catalogMaps = useFeedCatalogMaps(items);

  const openListing = useCallback((id: string) => {
    router.push(`/(public)/listings/${id}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListingsSchemas.ListingSummary }) => (
      <ListingGridCard
        listing={item}
        onPress={openListing}
        brandName={catalogMaps.brandName(item.brandId)}
        modelName={catalogMaps.modelName(item.modelId)}
        isAuthenticated={isAuthenticated}
        returnTo={HOME_HREF}
      />
    ),
    [catalogMaps, isAuthenticated, openListing],
  );

  const header = <HomeHeader />;

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        {header}
        <GridSkeleton />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        {header}
        <FeedError error={error} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<FeedEmpty />}
        columnWrapperClassName="gap-3 px-4"
        contentContainerClassName="gap-4 pb-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          ) : !hasNextPage && items.length > 0 ? (
            <View className="items-center py-4">
              <Text className="text-xs text-muted-foreground">{t("noMore")}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
