import { SlidersHorizontal, X } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { localeTag } from "../../i18n/resources";

import type { ListingFilter } from "./useListingFilters";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type ChipGroup = "city" | "price" | "year";
export function FilterChipsRow({ filters, cityName, onOpen, onRemove }: {
  filters: ListingFilter; cityName?: string; onOpen: () => void; onRemove: (group: ChipGroup) => void;
}) {
  const { t, i18n } = useTranslation();
  const chips: { group: ChipGroup; label: string }[] = [];
  const range = (min?: number, max?: number, unit = "") => {
    const format = (n: number) => n.toLocaleString(localeTag(i18n.language), { useGrouping: unit === "TMT" });
    return min != null && max != null ? `${format(min)} – ${format(max)} ${unit}`.trim() : min != null ? t("resultsFrom", { value: `${format(min)} ${unit}`.trim() }) : max != null ? t("resultsUpTo", { value: `${format(max)} ${unit}`.trim() }) : "";
  };
  if (filters.cityId) chips.push({ group: "city", label: cityName ?? t("city") });
  if (filters.priceMin != null || filters.priceMax != null) chips.push({ group: "price", label: range(filters.priceMin, filters.priceMax, "TMT") });
  if (filters.yearMin != null || filters.yearMax != null) chips.push({ group: "year", label: range(filters.yearMin, filters.yearMax) });
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2 px-4 py-2" keyboardShouldPersistTaps="handled">
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={t("resultsFilterCount", { count: chips.length })}
      className="min-h-11 flex-row items-center gap-2 rounded-full bg-foreground px-4">
      <Icon as={SlidersHorizontal} className="size-4 text-background" /><Text className="text-callout font-semibold text-background">{t("filters")}</Text>
      {chips.length > 0 ? <View className="min-w-5 items-center rounded-full bg-primary px-1.5 py-0.5"><Text className="text-caption font-semibold text-primary-foreground">{chips.length}</Text></View> : null}
    </Pressable>
    {chips.map((chip) => <Pressable key={chip.group} onPress={() => onRemove(chip.group)} accessibilityRole="button" accessibilityLabel={t(`resultsRemove_${chip.group}`)}
      className="min-h-11 flex-row items-center gap-2 rounded-full border border-border bg-card px-3">
      <Text className="text-callout text-foreground">{chip.label}</Text><Icon as={X} className="size-4 text-muted-foreground" />
    </Pressable>)}
  </ScrollView>;
}
