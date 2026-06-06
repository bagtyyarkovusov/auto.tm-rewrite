import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { useRegions } from "../../api/catalog/useRegions";
import { useCities } from "../../api/catalog/useCities";

import type { UseListingFiltersReturn } from "./useListingFilters";

import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet";
import { PickerRow } from "@/components/listings/wizard/PickerRow";
import { Text } from "@/components/ui/text";


interface CityFilterControlProps {
  draft: UseListingFiltersReturn["draft"];
  setField: UseListingFiltersReturn["setField"];
}

interface CityMeta {
  name: string;
  regionId: string;
}

/** Module-level cache survives sheet close/open cycles so the
 *  selected city name is still visible when the sheet reopens.
 */
const cityMetaCache = new Map<string, CityMeta>();

function filterBySearch<T extends { name: string }>(items: T[], search: string) {
  if (!search) return items;
  return items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
}

export function CityFilterControl({ draft, setField }: CityFilterControlProps) {
  const cached = draft.cityId ? cityMetaCache.get(draft.cityId) : undefined;

  const [regionOpen, setRegionOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState<string>(cached?.regionId ?? "");

  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (draft.cityId) {
      const cachedMeta = cityMetaCache.get(draft.cityId);
      if (cachedMeta) {
        setSelectedRegionId(cachedMeta.regionId);
      }
    } else if (!isInternalChangeRef.current) {
      setSelectedRegionId("");
    }
    isInternalChangeRef.current = false;
  }, [draft.cityId]);

  const {
    data: regionsData,
    isPending: regionsLoading,
    isError: regionsError,
  } = useRegions();

  const {
    data: citiesData,
    isPending: citiesLoading,
    isError: citiesError,
  } = useCities(selectedRegionId);

  const filteredRegions = useMemo(
    () => filterBySearch(regionsData?.items ?? [], regionSearch),
    [regionsData?.items, regionSearch],
  );

  const filteredCities = useMemo(
    () => filterBySearch(citiesData?.items ?? [], citySearch),
    [citiesData?.items, citySearch],
  );

  const selectedRegion = useMemo(
    () => regionsData?.items.find((r) => r.id === selectedRegionId),
    [regionsData?.items, selectedRegionId],
  );

  const selectedCity = useMemo(() => {
    const cityId = draft.cityId;
    if (!cityId) return undefined;
    const fromData = citiesData?.items.find((c) => c.id === cityId);
    if (fromData) return fromData;
    const cachedMeta = cityMetaCache.get(cityId);
    if (cachedMeta) return { id: cityId, name: cachedMeta.name };
    return undefined;
  }, [draft.cityId, citiesData?.items]);

  const handleSelectRegion = useCallback(
    (regionId: string) => {
      setSelectedRegionId(regionId);
      setRegionOpen(false);
      setRegionSearch("");
      if (draft.cityId) {
        cityMetaCache.delete(draft.cityId);
        setField("cityId", undefined);
      }
      setCityOpen(true);
      isInternalChangeRef.current = true;
    },
    [draft.cityId, setField],
  );

  const handleSelectCity = useCallback(
    (cityId: string) => {
      const city = citiesData?.items.find((c) => c.id === cityId);
      if (city) {
        cityMetaCache.set(cityId, { name: city.name, regionId: selectedRegionId });
      }
      setField("cityId", cityId);
      setCityOpen(false);
      setCitySearch("");
    },
    [citiesData?.items, selectedRegionId, setField],
  );

  const handleClearCity = useCallback(() => {
    if (draft.cityId) {
      cityMetaCache.delete(draft.cityId);
    }
    setField("cityId", undefined);
    setSelectedRegionId("");
  }, [draft.cityId, setField]);

  const canOpenCityPicker = !!selectedRegionId || !!draft.cityId;

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">City</Text>

      <View className="gap-2">
        <PickerRow
          label="Region"
          value={selectedRegion?.name}
          placeholder="Select region"
          onPress={() => setRegionOpen(true)}
        />

        <PickerRow
          label="City"
          value={selectedCity?.name}
          placeholder={selectedRegionId ? "Select city" : "Select region first"}
          disabled={!canOpenCityPicker}
          onPress={() => setCityOpen(true)}
        />
      </View>

      {draft.cityId && (
        <Pressable
          onPress={handleClearCity}
          accessibilityRole="button"
          accessibilityLabel="Clear city filter"
          className="self-start py-1"
        >
          <Text className="text-sm text-destructive">Clear city</Text>
        </Pressable>
      )}

      <CatalogPickerSheet
        open={regionOpen}
        onOpenChange={(open) => {
          setRegionOpen(open);
          if (!open) setRegionSearch("");
        }}
        title="Select region"
        searchPlaceholder="Search regions..."
        search={regionSearch}
        onSearchChange={setRegionSearch}
        items={filteredRegions}
        selectedId={selectedRegionId}
        emptyMessage={
          regionSearch ? "No regions match your search" : "No regions available"
        }
        isLoading={regionsLoading}
        isError={regionsError}
        onSelect={handleSelectRegion}
      />

      <CatalogPickerSheet
        open={cityOpen}
        onOpenChange={(open) => {
          setCityOpen(open);
          if (!open) setCitySearch("");
        }}
        title="Select city"
        searchPlaceholder="Search cities..."
        search={citySearch}
        onSearchChange={setCitySearch}
        items={filteredCities}
        selectedId={draft.cityId}
        emptyMessage={
          citySearch ? "No cities match your search" : "No cities available"
        }
        isLoading={citiesLoading}
        isError={citiesError}
        onSelect={handleSelectCity}
      />
    </View>
  );
}
