import { View } from "react-native";
import { MapPin, User, BadgeCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface SellerBlockProps {
  cityName?: string;
  regionName?: string;
  locationText?: string;
  contactPhone?: string;
  allowCalls: boolean;
  phoneVerified?: boolean;
}

export function SellerBlock({
  cityName,
  regionName,
  locationText,
  contactPhone,
  allowCalls,
  phoneVerified,
}: SellerBlockProps) {
  const { t } = useTranslation();
  const locationParts = [regionName, cityName, locationText].filter(Boolean);

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("seller")}
        </Text>
        {phoneVerified && (
          <Badge variant="default" className="shrink-0 px-2 py-0.5">
            <Icon as={BadgeCheck} className="size-3 text-foreground" />
            <Text className="text-xs text-foreground">{t("verifiedPhone")}</Text>
          </Badge>
        )}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon as={User} className="size-5 text-muted-foreground" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-base font-medium text-foreground" numberOfLines={1}>
              {t("privateSeller")}
            </Text>
            {allowCalls && contactPhone && (
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                {contactPhone}
              </Text>
            )}
          </View>
        </View>

        {locationParts.length > 0 && (
          <View className="flex-row items-start gap-1.5">
            <Icon as={MapPin} className="size-4 shrink-0 text-muted-foreground" />
            <Text className="min-w-0 flex-1 text-sm text-muted-foreground" numberOfLines={2}>
              {locationParts.join(", ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
