import { View } from "react-native";
import { MapPin, User } from "lucide-react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { localeTag } from "../../i18n/resources";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface SellerBlockProps {
  seller: ListingsSchemas.ListingDetail["seller"];
  cityName?: string;
  locationText?: string;
}
export function SellerBlock({
  seller,
  cityName,
  locationText,
}: SellerBlockProps) {
  const { t, i18n } = useTranslation();
  const name = seller.displayName?.trim();
  const joined = new Intl.DateTimeFormat(localeTag(i18n.language), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(seller.memberSince));
  const location = [cityName, locationText].filter(Boolean).join(" · ");
  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold">{t("seller")}</Text>
      <View className="flex-row gap-3 items-center">
        <View className="h-11 w-11 rounded-full bg-muted items-center justify-center">
          <Icon as={User} className="size-5 text-muted-foreground" />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-semibold" numberOfLines={1}>
            {name || t("privateSeller")}
          </Text>
          {name && (
            <Text className="text-sm text-muted-foreground">
              {t("privateSeller")}
            </Text>
          )}
          <Text className="text-sm text-muted-foreground">
            {t("sellerSince", { date: joined })}
          </Text>
        </View>
      </View>
      {!!location && (
        <View className="flex-row gap-2">
          <Icon as={MapPin} className="size-4 text-muted-foreground" />
          <Text className="flex-1 text-sm text-muted-foreground">
            {location}
          </Text>
        </View>
      )}
    </View>
  );
}
