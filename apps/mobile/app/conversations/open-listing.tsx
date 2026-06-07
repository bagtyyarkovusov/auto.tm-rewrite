import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOpenConversation } from "../../src/api/conversations/useOpenConversation";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function OpenListingConversationScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const openConversation = useOpenConversation();

  useEffect(() => {
    if (!listingId || openConversation.isPending || openConversation.isSuccess) {
      return;
    }

    openConversation.mutate({ listingId });
  }, [listingId, openConversation]);

  useEffect(() => {
    if (openConversation.isSuccess && openConversation.data) {
      const data = openConversation.data;
      const listing = data.listing;
      router.replace({
        pathname: `/conversations/${data.id}`,
        params: {
          listingId: listing?.id ?? "",
          brandId: listing?.brandId ?? "",
          modelId: listing?.modelId ?? "",
          year: listing?.year ? String(listing.year) : "",
          displayPriceTmt: listing?.displayPriceTmt
            ? String(listing.displayPriceTmt)
            : "",
          priceCurrency: listing?.priceCurrency ?? "",
          coverMediaKey: listing?.coverMediaKey ?? "",
          status: listing?.status ?? "",
        },
      });
    }
  }, [openConversation.isSuccess, openConversation.data, router]);

  if (openConversation.isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-lg font-semibold text-foreground">
            Could not open conversation
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {openConversation.error instanceof Error
              ? openConversation.error.message
              : "Something went wrong. Please try again."}
          </Text>
          <Button
            variant="brand"
            size="pill"
            onPress={() => {
              if (listingId) {
                openConversation.mutate({ listingId });
              }
            }}
          >
            <Text>Retry</Text>
          </Button>
          <Button variant="ghost" onPress={() => router.back()}>
            <Text>Go back</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator />
        <Text className="text-sm text-muted-foreground">Opening conversation…</Text>
      </View>
    </SafeAreaView>
  );
}
