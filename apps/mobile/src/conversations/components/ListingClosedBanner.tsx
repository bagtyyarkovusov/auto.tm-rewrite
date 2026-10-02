import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Info } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { Enums } from "@auto-tm/contracts";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  closedListingBannerKey,
  similarListingsHref,
} from "@/src/listings/detail/closedListing";

interface ListingClosedBannerProps {
  listing: { status: Enums.ListingStatus; brandId: string; modelId: string };
  brandName?: string;
  modelName?: string;
}

/**
 * The inline notice after the last Message when the Listing is sold or removed
 * from sale. The Conversation stays open; the link opens Results for the same
 * brand and model, as Listing detail's "See other" does (#352 D1, Q3).
 */
export function ListingClosedBanner({
  listing,
  brandName,
  modelName,
}: ListingClosedBannerProps) {
  const { t } = useTranslation();
  const { t: tConv } = useTranslation("conversations");

  const closed = closedListingBannerKey(listing.status);
  if (!closed) return null;

  const linkLabel =
    brandName && modelName
      ? t("seeOtherBrandModel", { brand: brandName, model: modelName })
      : null;

  return (
    <View
      className="mx-4 my-2.5 rounded-xl bg-secondary px-3 py-2.5"
      testID="listing-closed-banner"
    >
      <View className="flex-row items-start gap-2">
        <Icon as={Info} className="mt-0.5 size-4 text-muted-foreground" />
        <Text className="flex-1 text-sm text-foreground">
          {tConv(closed === "sold" ? "closedBannerSold" : "closedBannerRemoved")}
        </Text>
      </View>
      {linkLabel && (
        <Pressable
          onPress={() => router.push(similarListingsHref(listing))}
          className="min-h-11 justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={linkLabel}
        >
          <Text className="text-sm font-medium text-primary">{linkLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
