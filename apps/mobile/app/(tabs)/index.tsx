import { router } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useListings } from "../../src/api/listings/useListings";
import { FeedEmpty } from "../../src/listings/feed/FeedEmpty";
import { FeedError } from "../../src/listings/feed/FeedError";
import { FeedSkeleton } from "../../src/listings/feed/FeedSkeleton";
import { ListingCard } from "../../src/listings/feed/ListingCard";

import { Text } from "@/components/ui/text";

export default function FeedScreen() {
  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListings();

  const handlePress = useCallback((id: string) => {
    router.push(`/(public)/listings/${id}`);
  }, []);

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-6 pb-3">
          <Text className="text-2xl font-semibold text-foreground">Search</Text>
        </View>
        <FeedSkeleton />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-6 pb-3">
          <Text className="text-2xl font-semibold text-foreground">Search</Text>
        </View>
        <FeedError onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  if (allItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-6 pb-3">
          <Text className="text-2xl font-semibold text-foreground">Search</Text>
        </View>
        <FeedEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-semibold text-foreground">Search</Text>
      </View>
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
    </SafeAreaView>
  );
}
