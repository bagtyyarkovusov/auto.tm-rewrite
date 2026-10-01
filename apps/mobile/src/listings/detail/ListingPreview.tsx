import { Pressable, View } from "react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";

export interface ListingPreviewProps {
  summary: ListingsSchemas.ListingSummary;
  isOwner: boolean;
  onBack: () => void;
}

/**
 * Placeholder for the red checkpoint: an empty screen with enabled contact
 * buttons, so the specs fail on the unmet criteria rather than on a missing
 * module.
 */
export function ListingPreview(_props: ListingPreviewProps) {
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel="Call" />
      <Pressable accessibilityRole="button" accessibilityLabel="Message" />
    </View>
  );
}
