import { useState } from "react";
import { X } from "lucide-react-native";
import { View } from "react-native";

import type { UseListingFiltersReturn } from "./useListingFilters";
import { BrandModelFilterControl } from "./BrandModelFilterControl";
import { CityFilterControl } from "./CityFilterControl";
import { PriceRangeFilterControl } from "./PriceRangeFilterControl";
import { YearRangeFilterControl } from "./YearRangeFilterControl";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: UseListingFiltersReturn;
}

function ConditionSlot() {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Condition</Text>
      <View className="h-[52px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <Text className="text-sm text-muted-foreground">Condition picker (#162)</Text>
      </View>
    </View>
  );
}

export function FilterSheet({ open, onOpenChange, filters }: FilterSheetProps) {
  const { draft, setField, apply, reset, count, isValid } = filters;
  const [priceRangeValid, setPriceRangeValid] = useState(true);
  const isApplyDisabled = !isValid || !priceRangeValid;

  const handleApply = () => {
    apply();
    onOpenChange(false);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Filters</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Close filters"
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>

        <View className="min-h-0 flex-1 gap-4">
          <BrandModelFilterControl
            draft={filters.draft}
            setField={filters.setField}
          />
          <CityFilterControl draft={filters.draft} setField={filters.setField} />
          <PriceRangeFilterControl
            priceMin={draft.priceMin}
            priceMax={draft.priceMax}
            setField={setField}
            onValidityChange={setPriceRangeValid}
          />
          <YearRangeFilterControl draft={filters.draft} setField={filters.setField} />
          <ConditionSlot />
        </View>

        <View className="flex-row gap-3 pt-2">
          <Button
            variant="ghost"
            size="lg"
            className="flex-1"
            onPress={handleReset}
            accessibilityLabel="Reset all filters"
          >
            <Text>Reset all</Text>
          </Button>
          <Button
            variant="brand"
            size="pill"
            className="flex-1"
            onPress={handleApply}
            disabled={isApplyDisabled}
            accessibilityLabel="Apply filters"
          >
            <Text>{count > 0 ? `Show results (${count})` : "Apply"}</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
