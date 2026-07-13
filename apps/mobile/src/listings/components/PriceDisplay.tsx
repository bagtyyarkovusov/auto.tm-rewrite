import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";

function formatPrice(amount: number, locale: string): string {
  return `${amount.toLocaleString(locale)} TMT`;
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
  const { t, i18n } = useTranslation();
  const showOriginal = isOwner && priceCurrency !== "TMT";

  return (
    <View className="gap-2">
      <Text className="text-3xl font-heading text-primary" numberOfLines={1}>
        {formatPrice(displayPriceTmt, i18n.language)}
      </Text>

      {showOriginal && (
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {priceAmount.toLocaleString(i18n.language)} {priceCurrency}
        </Text>
      )}

      {(acceptsExchange || installmentAvailable) && (
        <View className="flex-row flex-wrap gap-2">
          {acceptsExchange && (
            <Badge variant="secondary" className="px-2 py-0.5">
              <Text className="text-xs text-secondary-foreground">
                {t("exchangePossible")}
              </Text>
            </Badge>
          )}
          {installmentAvailable && (
            <Badge variant="secondary" className="px-2 py-0.5">
              <Text className="text-xs text-secondary-foreground">
                {t("installmentPossible")}
              </Text>
            </Badge>
          )}
        </View>
      )}
    </View>
  );
}
