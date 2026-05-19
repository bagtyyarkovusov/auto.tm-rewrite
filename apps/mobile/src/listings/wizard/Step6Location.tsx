import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useRegions } from "../../api/catalog/useRegions";
import { useCities } from "../../api/catalog/useCities";

import type { WizardSchemas } from "@auto-tm/contracts";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Step6LocationProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={onPress}
      accessibilityLabel="Close"
    >
      <Icon as={X} className="size-5 text-foreground" />
    </Button>
  );
}

export default function Step6Location({
  payload,
  onChange,
  fieldErrors,
  disabled,
}: Step6LocationProps) {
  const [regionOpen, setRegionOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const { data: regionsData } = useRegions();
  const { data: citiesData } = useCities(payload.regionId ?? "");

  const filteredRegions = useMemo(() => {
    if (!regionSearch) return regionsData?.items ?? [];
    return (regionsData?.items ?? []).filter((r) =>
      r.name.toLowerCase().includes(regionSearch.toLowerCase()),
    );
  }, [regionsData, regionSearch]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return citiesData?.items ?? [];
    return (citiesData?.items ?? []).filter((c) =>
      c.name.toLowerCase().includes(citySearch.toLowerCase()),
    );
  }, [citiesData, citySearch]);

  const selectedRegion = regionsData?.items.find(
    (r) => r.id === payload.regionId,
  );
  const selectedCity = citiesData?.items.find(
    (c) => c.id === payload.cityId,
  );

  function handleSelectRegion(regionId: string) {
    onChange({ regionId, cityId: undefined });
    setRegionOpen(false);
    setRegionSearch("");
  }

  function handleSelectCity(cityId: string) {
    onChange({ cityId });
    setCityOpen(false);
    setCitySearch("");
  }

  const wrapDisabled = (children: React.ReactNode) => {
    if (!disabled) return <>{children}</>;
    return <View className="opacity-50">{children}</View>;
  };

  return (
    <View className="gap-4 py-4">
      {/* Region */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Region *</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setRegionOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text
              className={
                selectedRegion ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedRegion?.name ?? "Select region"}
            </Text>
          </Button>,
        )}
        {fieldErrors?.regionId && (
          <Text className="text-sm text-destructive">
            {fieldErrors.regionId}
          </Text>
        )}
      </View>

      {/* City */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">City *</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setCityOpen(true)}
            disabled={disabled || !payload.regionId}
            className="justify-start"
          >
            <Text
              className={
                selectedCity ? "text-foreground" : "text-muted-foreground"
              }
            >
              {selectedCity?.name ?? "Select city"}
            </Text>
          </Button>,
        )}
        {fieldErrors?.cityId && (
          <Text className="text-sm text-destructive">
            {fieldErrors.cityId}
          </Text>
        )}
      </View>

      {/* Location text */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">
          Area / landmark
        </Text>
        {wrapDisabled(
          <Input
            value={payload.locationText ?? ""}
            onChangeText={(text) =>
              onChange({ locationText: text || undefined })
            }
            placeholder="e.g. near Ashgabat Bazaar"
            editable={!disabled}
          />,
        )}
        {fieldErrors?.locationText && (
          <Text className="text-sm text-destructive">
            {fieldErrors.locationText}
          </Text>
        )}
      </View>

      <Text className="text-sm text-muted-foreground">
        Choose where the car can be inspected. Do not enter your home address.
      </Text>

      {/* Region Sheet */}
      <Sheet open={regionOpen} onOpenChange={setRegionOpen}>
        <SheetContent>
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>Select region</SheetTitle>
            <SheetCloseButton onPress={() => setRegionOpen(false)} />
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={regionSearch}
            onChangeText={setRegionSearch}
            className="mb-2"
          />
          <ScrollView>
            {filteredRegions.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => handleSelectRegion(r.id)}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{r.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SheetContent>
      </Sheet>

      {/* City Sheet */}
      <Sheet open={cityOpen} onOpenChange={setCityOpen}>
        <SheetContent>
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>Select city</SheetTitle>
            <SheetCloseButton onPress={() => setCityOpen(false)} />
          </SheetHeader>
          <Input
            placeholder="Search..."
            value={citySearch}
            onChangeText={setCitySearch}
            className="mb-2"
          />
          <ScrollView>
            {filteredCities.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => handleSelectCity(c.id)}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SheetContent>
      </Sheet>
    </View>
  );
}
