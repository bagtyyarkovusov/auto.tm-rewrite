import { Pressable, Text, View } from "react-native";
import type { Enums } from "@auto-tm/contracts";

export interface AskSellerChipsProps {
  listingId: string;
  isOwner: boolean;
  status: Enums.ListingStatus;
  allowChat: boolean;
}

/**
 * Placeholder for the red checkpoint: chips with no behavior and no hiding
 * rules, so the specs fail on the unmet criteria rather than on a missing
 * module.
 */
export function AskSellerChips(_props: AskSellerChipsProps) {
  return (
    <View>
      <Text>Ask</Text>
      {["a", "b", "c", "d"].map((key) => (
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={key} />
      ))}
    </View>
  );
}
