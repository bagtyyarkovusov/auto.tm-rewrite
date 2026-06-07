import { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  View,
} from "react-native";

import { useConversations } from "../../api/conversations/useConversations";

import { ConversationListItem } from "./ConversationListItem";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

function LoadingSkeleton() {
  return (
    <View className="px-4 py-3 gap-3">
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
  return (
    <View className="flex-1 items-center justify-center px-6 gap-2">
      <Text className="text-base text-foreground">No conversations yet</Text>
      <Text className="text-sm text-muted-foreground text-center">
        Start by messaging a seller from a listing
      </Text>
    </View>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 gap-3">
      <Text className="text-base text-foreground">
        Could not load conversations
      </Text>
      <Button variant="outline" size="pill" onPress={onRetry}>
        <Text>Retry</Text>
      </Button>
    </View>
  );
}

export function ConversationList() {
  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations();

  const conversations = data?.pages.flatMap((page) => page.items) ?? [];

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

  if (isError) {
    return <ErrorState onRetry={handleRefresh} />;
  }

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ConversationListItem conversation={item} />}
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
