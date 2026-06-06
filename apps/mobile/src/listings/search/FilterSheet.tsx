import { X } from "lucide-react-native";
import { View } from "react-native";

import type { UseListingFiltersReturn } from "./useListingFilters";

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

/** Named slots for per-control slices (#158–#162).
 *  Each future control adds one component file + one line here.
 */
function BrandSlot() {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Brand</Text>
      <View className="h-[52px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <Text className="text-sm text-muted-foreground">Brand picker (#158)</Text>
      </View>
    </View>
  );
}

function ModelSlot() {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Model</Text>
      <View className="h-[52px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <Text className="text-sm text-muted-foreground">Model picker (#159)</Text>
      </View>
    </View>
  );
}

function CitySlot() {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">City</Text>
      <View className="h-[52px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <Text className="text-sm text-muted-foreground">City picker (#160)</Text>
      </View>
    </View>
  );
}

function PriceRangeSlot() {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Price range</Text>
      <View className="h-[52px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <Text className="text-sm text-muted-foreground">Price range (#161)</Text>
      </View>
    </View>
  );
}

function YearRangeSlot() {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Year range</Text>
      <View className="h-[52px] items-center justify-center rounded-lg border border-dashed border-border bg-card">
        <Text className="text-sm text-muted-foreground">Year range (#161)</Text>
      </View>
    </View>
  );
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
  const { apply, reset, count } = filters;

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
          <BrandSlot />
          <ModelSlot />
          <CitySlot />
          <PriceRangeSlot />
          <YearRangeSlot />
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
            accessibilityLabel="Apply filters"
          >
            <Text>{count > 0 ? `Show results (${count})` : "Apply"}</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
