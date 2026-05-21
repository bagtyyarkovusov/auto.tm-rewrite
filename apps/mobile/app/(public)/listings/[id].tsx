import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { FlatList, ScrollView, View, Dimensions, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useListingDetail } from "../../../src/api/listings/useListingDetail";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const SCREEN_WIDTH = Dimensions.get("window").width;

function formatPrice(amount: number, _currency: string): string {
  // TMT has no standard locale; use en-US grouping and append currency
  return `${amount.toLocaleString("en-US")} TMT`;
}

function SkeletonStub() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="px-5 py-4 gap-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
        </View>
        <View className="h-[240px]">
          <Skeleton className="h-full w-full rounded-none" />
        </View>
        <View className="px-5 py-4 gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ErrorStub({ onRetry }: { onRetry?: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-lg font-semibold text-foreground">
          Listing unavailable
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          This listing may have been removed or is temporarily unavailable.
        </Text>
        {onRetry && (
          <Button onPress={onRetry}>
            <Text className="text-primary-foreground">Retry</Text>
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

function PhotoCarousel({ media }: { media: Array<{ id: string; variants: { detail: string } }> }) {
  const renderItem = useCallback(
    ({ item }: { item: { id: string; variants: { detail: string } } }) => (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 }}>
        <Image
          source={{ uri: item.variants.detail }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    ),
    [],
  );

  return (
    <FlatList
      data={media}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
    />
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, error, refetch } = useListingDetail(id ?? "");

  if (isPending) return <SkeletonStub />;
  if (error || !data) return <ErrorStub onRetry={() => refetch()} />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="px-5 py-4 gap-3">
          <Text className="text-2xl font-heading text-foreground">
            {data.year} {data.brandId} {data.modelId}
          </Text>
          <Text className="text-xl font-semibold text-primary">
            {formatPrice(data.displayPriceTmt, data.priceCurrency)}
          </Text>
        </View>
        <PhotoCarousel media={data.media} />
        <View className="px-5 py-4">
          <Text className="text-base text-foreground">{data.description}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
