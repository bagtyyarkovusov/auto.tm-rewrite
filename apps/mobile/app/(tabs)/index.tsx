import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useListings } from "../../src/api/listings/useListings";
import { FeedEmpty } from "../../src/listings/feed/FeedEmpty";
import { FeedError } from "../../src/listings/feed/FeedError";
import { FeedSkeleton } from "../../src/listings/feed/FeedSkeleton";
import { ListingCard } from "../../src/listings/feed/ListingCard";
import { FilterSheet } from "../../src/listings/search/FilterSheet";
import { useListingFilters } from "../../src/listings/search/useListingFilters";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

export default function FeedScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const filters = useListingFilters();

  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListings({ filters: filters.active })

  const handlePress = useCallback((id: string) => {
    router.push(`/(public)/listings/${id}`);
  }, []);

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  const header = (
    <View className="px-4 pt-6 pb-3 flex-row items-center justify-between">
      <Text className="text-2xl font-semibold text-foreground">Search</Text>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        className="flex-row items-center gap-2"
      >
        {filters.count > 0 ? (
          <Badge variant="brand">
            <Text>{filters.count}</Text>
          </Badge>
        ) : null}
        <Text className="text-sm font-medium text-foreground">Filters</Text>
      </Pressable>
    </View>
  );

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {header}
        <FeedSkeleton />
        <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {header}
        <FeedError onRetry={() => refetch()} />
        <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
      </SafeAreaView>
    );
  }

  if (allItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {header}
        <FeedEmpty />
        <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {header}
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={handlePress} />
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
                No more listings
              </Text>
            </View>
          ) : null
        }
      />
      <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
    </SafeAreaView>
  );
}
