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
import { useViewer } from "../../../src/auth/useViewer";
import { FeedEmpty } from "../../../src/listings/feed/FeedEmpty";
import { FeedError } from "../../../src/listings/feed/FeedError";
import {
  ListingGridCard,
  ListingGridCardSkeleton,
} from "../../../src/listings/feed/ListingGridCard";
import { useFeedCatalogMaps } from "../../../src/listings/feed/useFeedCatalogMaps";
import { useFeedFavoriteReplay } from "../../../src/listings/feed/useFeedFavoriteReplay";
import { HOME_HREF } from "../../../src/navigation/homeHref";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { localeTag } from "@/src/i18n/resources";

const SKELETON_ROWS = [0, 1, 2];

/**
 * Fills the second column of an odd last row. Without it the last card's
 * `flex-1` would take the whole row and read as a large card.
 */
const GRID_SPACER = { id: "grid-spacer" } as const;
type GridCell = ListingsSchemas.ListingSummary | typeof GRID_SPACER;
const isSpacer = (cell: GridCell): cell is typeof GRID_SPACER => cell === GRID_SPACER;

function HomeHeader() {
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

function GridSkeleton() {
  return (
    <View className="mt-3 gap-3 px-4">
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
  useFeedFavoriteReplay();

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
  const cells = useMemo<GridCell[]>(
    () => (items.length % 2 === 1 ? [...items, GRID_SPACER] : items),
    [items],
  );

  const openListing = useCallback((id: string) => {
    router.push(`/(public)/listings/${id}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: GridCell }) =>
      isSpacer(item) ? (
        <View className="flex-1" />
      ) : (
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
        data={cells}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<FeedEmpty />}
        columnWrapperClassName="gap-3 px-4"
        contentContainerClassName="gap-3 pb-4"
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
