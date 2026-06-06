import { Share, View } from "react-native";
import * as Linking from "expo-linking";
import { Phone, MessageCircle, Share2, Heart } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface ContactCtaBarProps {
  listingId: string;
  contactPhone?: string;
  allowCalls: boolean;
  status: Enums.ListingStatus;
}

export function ContactCtaBar({
  listingId,
  contactPhone,
  allowCalls,
  status,
}: ContactCtaBarProps) {
  const isSold = status === Enums.ListingStatus.Sold;
  const canCall = allowCalls && !!contactPhone && !isSold;

  const handleCall = async () => {
    if (!canCall || !contactPhone) return;
    const url = `tel:${contactPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this car on AutoTM`,
        url: `https://autotm.tm/listings/${listingId}`,
      });
    } catch {
      // Silently ignore share cancellation or errors
    }
  };

  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <Button
        variant={canCall ? "brand" : "secondary"}
        size="lg"
        className="flex-1"
        onPress={handleCall}
        disabled={!canCall}
      >
        <Icon as={Phone} className="size-5 text-primary-foreground" />
        <Text>Call</Text>
      </Button>

      <Button
        variant="secondary"
        size="icon"
        disabled
        accessibilityLabel="Chat coming soon"
        accessibilityState={{ disabled: true }}
      >
        <Icon as={MessageCircle} className="size-5 text-muted-foreground" />
      </Button>

      <Button variant="secondary" size="icon" onPress={handleShare}>
        <Icon as={Share2} className="size-5 text-foreground" />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        disabled
        accessibilityLabel="Favorite coming soon"
        accessibilityState={{ disabled: true }}
      >
        <Icon as={Heart} className="size-5 text-muted-foreground" />
      </Button>
    </View>
  );
}
