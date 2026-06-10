import { useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart, AlertTriangle } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../src/auth/useAuth";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { useMyFavorites } from "../../src/api/listings/useMyFavorites";
import { ListingCard } from "../../src/listings/feed/ListingCard";
import { useFeedCatalogMaps } from "../../src/listings/feed/useFeedCatalogMaps";
import { FeedSkeleton } from "../../src/listings/feed/FeedSkeleton";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

function AnonymousFavoritesEntry() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSignIn = () => {
    useAuthIntentStore.getState().setIntent({
      returnPath: "/(tabs)/favorites",
    });
    router.push("/(auth)/phone");
  };

  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Icon as={Heart} className="size-8 text-muted-foreground" />
      <Text className="text-base text-foreground">{t("signInToSee")}</Text>
      <Button variant="brand" size="pill" onPress={handleSignIn}>
        <Text>{t("signIn")}</Text>
      </Button>
    </View>
  );
}

function FavoritesError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6 gap-4">
      <Icon as={AlertTriangle} className="size-8 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text className="text-base font-semibold text-foreground">
          {t("couldNotLoadListings")}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {t("checkConnection")}
        </Text>
      </View>
      <Button variant="outline" size="pill" onPress={onRetry}>
        <Text>{t("retry")}</Text>
      </Button>
    </View>
  );
}

function FavoritesEmpty() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-6 gap-3">
      <Icon as={Heart} className="size-8 text-muted-foreground" />
      <Text className="text-base text-foreground">{t("noFavoritesYet")}</Text>
      <Text className="text-center text-sm text-muted-foreground">
        {t("favoritesSaveLater")}
      </Text>
    </View>
  );
}

function FavoritesContent() {
  const router = useRouter();
  const { t } = useTranslation();

  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyFavorites();

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/(public)/listings/${id}`);
    },
    [router],
  );

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];
  const catalogMaps = useFeedCatalogMaps(allItems);

  if (isPending) {
    return <FeedSkeleton />;
  }

  if (isError) {
    return <FavoritesError onRetry={() => refetch()} />;
  }

  if (allItems.length === 0) {
    return <FavoritesEmpty />;
  }

  return (
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
  );
}

export default function FavoritesScreen() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="px-4 pt-6 pb-3">
        <Text className="text-2xl font-heading text-foreground">
          {t("favorites")}
        </Text>
      </View>

      {isAuthenticated === false ? (
        <AnonymousFavoritesEntry />
      ) : isAuthenticated === true ? (
        <FavoritesContent />
      ) : (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="text-sm text-muted-foreground">{t("loading")}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
