import { View } from "react-native";
import { MapPin, User } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface SellerBlockProps {
  cityName?: string;
  regionName?: string;
  locationText?: string;
  contactPhone?: string;
  allowCalls: boolean;
}

export function SellerBlock({
  cityName,
  regionName,
  locationText,
  contactPhone,
  allowCalls,
}: SellerBlockProps) {
  const locationParts = [regionName, cityName, locationText].filter(Boolean);

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Seller
      </Text>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon as={User} className="size-5 text-muted-foreground" />
          </View>
          <View>
            <Text className="text-base font-medium text-foreground">
              Private seller
            </Text>
            {allowCalls && contactPhone && (
              <Text className="text-sm text-muted-foreground">
                {contactPhone}
              </Text>
            )}
          </View>
        </View>

        {locationParts.length > 0 && (
          <View className="flex-row items-center gap-1.5">
            <Icon as={MapPin} className="size-4 text-muted-foreground" />
            <Text className="text-sm text-muted-foreground" numberOfLines={2}>
              {locationParts.join(", ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
