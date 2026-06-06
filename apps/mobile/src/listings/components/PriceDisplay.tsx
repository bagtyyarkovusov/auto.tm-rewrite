import { View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("en-US")} TMT`;
}

interface PriceDisplayProps {
  displayPriceTmt: number;
  priceAmount: number;
  priceCurrency: string;
  acceptsExchange: boolean;
  installmentAvailable: boolean;
  isOwner?: boolean;
}

export function PriceDisplay({
  displayPriceTmt,
  priceAmount,
  priceCurrency,
  acceptsExchange,
  installmentAvailable,
  isOwner = false,
}: PriceDisplayProps) {
  const showOriginal = isOwner && priceCurrency !== "TMT";

  return (
    <View className="gap-2">
      <Text className="text-3xl font-heading text-primary">
        {formatPrice(displayPriceTmt)}
      </Text>

      {showOriginal && (
        <Text className="text-sm text-muted-foreground">
          {priceAmount.toLocaleString("en-US")} {priceCurrency}
        </Text>
      )}

      {(acceptsExchange || installmentAvailable) && (
        <View className="flex-row flex-wrap gap-2">
          {acceptsExchange && (
            <Badge variant="secondary" className="px-2 py-0.5">
              <Text className="text-xs text-secondary-foreground">
                Exchange possible
              </Text>
            </Badge>
          )}
          {installmentAvailable && (
            <Badge variant="secondary" className="px-2 py-0.5">
              <Text className="text-xs text-secondary-foreground">
                Installment possible
              </Text>
            </Badge>
          )}
        </View>
      )}
    </View>
  );
}
