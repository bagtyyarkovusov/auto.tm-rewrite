import { useState, useEffect } from "react";
import { View } from "react-native";

import { parseYearInput } from "./yearRangeFilterLogic";
import type { ListingFilter, UseListingFiltersReturn } from "./useListingFilters";

import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

interface YearRangeFilterControlProps {
  draft: ListingFilter;
  setField: UseListingFiltersReturn["setField"];
}

export function YearRangeFilterControl({
  draft,
  setField,
}: YearRangeFilterControlProps) {
  const [minText, setMinText] = useState(draft.yearMin?.toString() ?? "");
  const [maxText, setMaxText] = useState(draft.yearMax?.toString() ?? "");

  useEffect(() => {
    setMinText(draft.yearMin?.toString() ?? "");
  }, [draft.yearMin]);

  useEffect(() => {
    setMaxText(draft.yearMax?.toString() ?? "");
  }, [draft.yearMax]);

  function handleMinChange(text: string) {
    setMinText(text);
    setField("yearMin", parseYearInput(text));
  }

  function handleMaxChange(text: string) {
    setMaxText(text);
    setField("yearMax", parseYearInput(text));
  }

  const isInvalid =
    draft.yearMin != null && draft.yearMax != null && draft.yearMin > draft.yearMax;

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Year range</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            value={minText}
            onChangeText={handleMinChange}
            placeholder="From"
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Minimum year"
          />
        </View>
        <View className="flex-1">
          <Input
            value={maxText}
            onChangeText={handleMaxChange}
            placeholder="To"
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Maximum year"
          />
        </View>
      </View>
      {isInvalid && (
        <Text className="text-sm text-destructive">
          Minimum year cannot be greater than maximum year
        </Text>
      )}
    </View>
  );
}
