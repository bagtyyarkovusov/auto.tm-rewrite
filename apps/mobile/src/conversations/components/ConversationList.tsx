import { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useConversations } from "../../api/conversations/useConversations";

import { ConversationListItem } from "./ConversationListItem";
import { useConversationCatalogMaps } from "./useConversationCatalogMaps";

import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

function LoadingSkeleton() {
  return (
    <View className="flex-1 px-4 py-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-lg" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6 gap-2">
      <Text className="text-base text-foreground">{t("noConversationsYet")}</Text>
      <Text className="text-sm text-muted-foreground text-center">
        {t("startByMessaging")}
      </Text>
    </View>
  );
}

export function ConversationList() {
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
  } = useConversations();

  const conversations = data?.pages.flatMap((page) => page.items) ?? [];
  const catalogMaps = useConversationCatalogMaps(
    conversations.map((c) => c.listing),
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isPending) {
    return <LoadingSkeleton />;
  }

  if (isError && !data) {
    return <ErrorState error={error} onRetry={handleRefresh} />;
  }

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ConversationListItem
          conversation={item}
          brandName={item.listing ? catalogMaps.brandName(item.listing.brandId) : undefined}
          modelName={item.listing ? catalogMaps.modelName(item.listing.modelId) : undefined}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
        />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className="py-4 items-center">
            <Skeleton className="h-4 w-32 rounded" />
          </View>
        ) : null
      }
    />
  );
}
