// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "CityFilterControl.tsx"), "utf-8");

describe("CityFilterControl structure", () => {
  it("imports useRegions and useCities catalog hooks", () => {
    expect(source).toContain('import { useRegions } from "../../api/catalog/useRegions"');
    expect(source).toContain('import { useCities } from "../../api/catalog/useCities"');
  });

  it("imports CatalogPickerSheet and PickerRow from wizard components", () => {
    expect(source).toContain('import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet"');
    expect(source).toContain('import { PickerRow } from "@/components/listings/wizard/PickerRow"');
  });

  it("accepts draft and setField props matching UseListingFiltersReturn", () => {
    expect(source).toContain("interface CityFilterControlProps");
    expect(source).toContain("draft: UseListingFiltersReturn");
    expect(source).toContain("setField: UseListingFiltersReturn");
  });

  it("maintains a module-level city meta cache", () => {
    expect(source).toContain("const cityMetaCache = new Map<string, CityMeta>");
  });

  it("uses filterBySearch for searchable picker lists", () => {
    expect(source).toContain("function filterBySearch");
    expect(source).toContain("i.name.toLowerCase().includes(search.toLowerCase())");
  });
});

describe("CityFilterControl region drilldown", () => {
  it("renders a Region picker row", () => {
    expect(source).toContain('label="Region"');
    expect(source).toContain('placeholder="Select region"');
  });

  it("renders a City picker row that depends on region selection", () => {
    expect(source).toContain('label="City"');
    expect(source).toContain('placeholder={selectedRegionId ? "Select city" : "Select region first"}');
  });

  it("disables city picker when no region is selected and no cached city exists", () => {
    expect(source).toContain("disabled={!canOpenCityPicker}");
    expect(source).toContain("const canOpenCityPicker = !!selectedRegionId || !!draft.cityId");
  });

  it("opens region picker when region row is pressed", () => {
    expect(source).toContain("setRegionOpen(true)");
  });

  it("opens city picker when city row is pressed", () => {
    expect(source).toContain("setCityOpen(true)");
  });
});

describe("CityFilterControl selection behavior", () => {
  it("caches city name and regionId on city selection", () => {
    expect(source).toContain("cityMetaCache.set(cityId, { name: city.name, regionId: selectedRegionId })");
  });

  it("writes cityId to the filter draft via setField", () => {
    expect(source).toContain('setField("cityId", cityId)');
  });

  it("clears existing city from draft and cache when region changes", () => {
    expect(source).toContain("cityMetaCache.delete(draft.cityId)");
    expect(source).toContain('setField("cityId", undefined)');
    expect(source).toContain("setCityOpen(true)"); // auto-opens city picker after region pick
  });

  it("restores selectedRegionId from cache on mount when draft.cityId exists", () => {
    expect(source).toContain("const cached = draft.cityId ? cityMetaCache.get(draft.cityId) : undefined");
    expect(source).toContain("useState<string>(cached?.regionId ?? \"\")");
  });

  it("resolves selected city name from data or cache", () => {
    expect(source).toContain("citiesData?.items.find((c) => c.id === cityId)");
    expect(source).toContain("cityMetaCache.get(cityId)");
    expect(source).toContain("return { id: cityId, name: cachedMeta.name }");
  });
});

describe("CityFilterControl external draft sync", () => {
  it("uses an effect to keep selectedRegionId in sync with draft.cityId", () => {
    expect(source).toContain("useEffect");
    expect(source).toContain("isInternalChangeRef");
    expect(source).toContain("isInternalChangeRef.current = false");
  });

  it("restores region from cache when draft.cityId is set externally", () => {
    expect(source).toContain("const cachedMeta = cityMetaCache.get(draft.cityId)");
    expect(source).toContain("setSelectedRegionId(cachedMeta.regionId)");
  });

  it("resets selectedRegionId when draft.cityId is cleared externally", () => {
    expect(source).toContain("} else if (!isInternalChangeRef.current) {");
    expect(source).toContain('setSelectedRegionId("")');
  });
});

describe("CityFilterControl clearability", () => {
  it("renders a clear action when a city is selected", () => {
    expect(source).toContain("{draft.cityId && (");
    expect(source).toContain("Clear city");
  });

  it("clears draft cityId and removes from cache on clear", () => {
    expect(source).toContain("cityMetaCache.delete(draft.cityId)");
    expect(source).toContain('setField("cityId", undefined)');
    expect(source).toContain('setSelectedRegionId("")');
  });
});

describe("CityFilterControl picker states", () => {
  it("passes loading state to CatalogPickerSheet for regions", () => {
    expect(source).toContain("isLoading={regionsLoading}");
  });

  it("passes error state to CatalogPickerSheet for regions", () => {
    expect(source).toContain("isError={regionsError}");
  });

  it("passes loading state to CatalogPickerSheet for cities", () => {
    expect(source).toContain("isLoading={citiesLoading}");
  });

  it("passes error state to CatalogPickerSheet for cities", () => {
    expect(source).toContain("isError={citiesError}");
  });

  it("provides empty messages for both pickers", () => {
    expect(source).toContain('"No regions match your search"');
    expect(source).toContain('"No regions available"');
    expect(source).toContain('"No cities match your search"');
    expect(source).toContain('"No cities available"');
  });

  it("provides search placeholders for both pickers", () => {
    expect(source).toContain('searchPlaceholder="Search regions..."');
    expect(source).toContain('searchPlaceholder="Search cities..."');
  });
});
