import type { ListingsSchemas } from "@auto-tm/contracts";
import { ArrowDownUp, ChevronLeft } from "lucide-react-native";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { formatPriceRange } from "../formatPrice";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function ResultsHeader({ count, sort, onSort, onBack }: {
  count?: ListingsSchemas.ListingCountResponse; sort: ListingsSchemas.FeedSort; onSort: () => void; onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  const range = count?.priceMinTmt != null && count.priceMaxTmt != null
    ? formatPriceRange(count.priceMinTmt, count.priceMaxTmt, i18n.language) : null;
  return <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
    <Button variant="secondary" size="icon" className="h-11 w-11" onPress={onBack} accessibilityLabel={t("back")}><Icon as={ChevronLeft} className="size-6 text-foreground" /></Button>
    <View className="min-w-0 flex-1">
      <Text className="text-headline font-heading font-semibold text-foreground" numberOfLines={1}>{count ? t("listingsCount", { total: count.totalMatching }) : t("carsBrowseTitle")}</Text>
      {range ? <Text className="text-caption text-muted-foreground" numberOfLines={1}>{range}</Text> : null}
      <Text className="text-caption text-muted-foreground" numberOfLines={1}>{t(`resultsSort_${sort}`)}</Text>
    </View>
    <Button variant="secondary" className="h-11 gap-1.5 rounded-full px-4" onPress={onSort} accessibilityLabel={t("resultsSort")}><Icon as={ArrowDownUp} className="size-4 text-foreground" /><Text className="text-callout">{t("resultsSort")}</Text></Button>
  </View>;
}
