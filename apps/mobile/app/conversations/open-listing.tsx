import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useOpenConversation } from "../../src/api/conversations/useOpenConversation";
import { useSafeBack } from "../../src/navigation/useSafeBack";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { ErrorState } from "@/components/ErrorState";

export default function OpenListingConversationScreen() {
  const { t } = useTranslation();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const goBack = useSafeBack("/(tabs)/chat");
  const {
    mutate,
    isPending,
    isSuccess,
    isError,
    data,
    error,
  } = useOpenConversation();

  useEffect(() => {
    if (!listingId || isPending || isSuccess) {
      return;
    }

    mutate({ listingId });
  }, [listingId, mutate, isPending, isSuccess]);

  useEffect(() => {
    if (isSuccess && data) {
      const listing = data.listing;
      router.replace({
        pathname: "/conversations/[id]",
        params: {
          id: data.id,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
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
  }, [isSuccess, data, router]);

  if (!listingId) {
    return (
      <SafeScreen>
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="text-lg font-semibold text-foreground">
            {t("couldNotOpenConversation")}
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {t("listingInformationMissing")}
          </Text>
          <Button variant="ghost" onPress={goBack}>
            <Text>{t("goBack")}</Text>
          </Button>
        </View>
      </SafeScreen>
    );
  }

  if (isError) {
    return (
      <SafeScreen>
        <ErrorState
          error={error}
          onRetry={() => mutate({ listingId })}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator />
        <Text className="text-sm text-muted-foreground">{t("openingConversation")}</Text>
      </View>
    </SafeScreen>
  );
}
