import { useMemo } from "react";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useGenerations } from "../../api/catalog/useGenerations";
import { useColors } from "../../api/catalog/useColors";
import { useBodyTypes } from "../../api/catalog/useBodyTypes";
import { useTransmissions } from "../../api/catalog/useTransmissions";
import { useDriveTypes } from "../../api/catalog/useDriveTypes";
import { useEngineTypes } from "../../api/catalog/useEngineTypes";
import { useRegions } from "../../api/catalog/useRegions";
import { useCities } from "../../api/catalog/useCities";

export interface CatalogMaps {
  brandName: (id: string) => string | undefined;
  modelName: (id: string) => string | undefined;
  generationName: (id: string) => string | undefined;
  colorName: (id: string) => string | undefined;
  bodyTypeName: (id: string) => string | undefined;
  transmissionName: (id: string) => string | undefined;
  driveTypeName: (id: string) => string | undefined;
  engineTypeName: (id: string) => string | undefined;
  regionName: (id: string) => string | undefined;
  cityName: (id: string) => string | undefined;
}

export function useCatalogMaps(
  brandId?: string,
  modelId?: string,
  regionId?: string,
  locale: "tk" | "ru" | "en" = "ru",
): { maps: CatalogMaps; isLoading: boolean } {
  const brands = useBrands(locale);
  const models = useModels(brandId ?? "", locale);
  const generations = useGenerations(modelId ?? "", locale);
  const colors = useColors(locale);
  const bodyTypes = useBodyTypes(locale);
  const transmissions = useTransmissions(locale);
  const driveTypes = useDriveTypes(locale);
  const engineTypes = useEngineTypes(locale);
  const regions = useRegions(locale);
  const cities = useCities(regionId ?? "", locale);

  const maps = useMemo<CatalogMaps>(
    () => ({
      brandName: (id: string) =>
        brands.data?.items.find((b) => b.id === id)?.name,
      modelName: (id: string) =>
        models.data?.items.find((m) => m.id === id)?.name,
      generationName: (id: string) =>
        generations.data?.items.find((g) => g.id === id)?.name,
      colorName: (id: string) =>
        colors.data?.items.find((c) => c.id === id)?.name,
      bodyTypeName: (id: string) =>
        bodyTypes.data?.items.find((b) => b.id === id)?.name,
      transmissionName: (id: string) =>
        transmissions.data?.items.find((t) => t.id === id)?.name,
      driveTypeName: (id: string) =>
        driveTypes.data?.items.find((d) => d.id === id)?.name,
      engineTypeName: (id: string) =>
        engineTypes.data?.items.find((e) => e.id === id)?.name,
      regionName: (id: string) =>
        regions.data?.items.find((r) => r.id === id)?.name,
      cityName: (id: string) =>
        cities.data?.items.find((c) => c.id === id)?.name,
    }),
    [
      brands.data,
      models.data,
      generations.data,
      colors.data,
      bodyTypes.data,
      transmissions.data,
      driveTypes.data,
      engineTypes.data,
      regions.data,
      cities.data,
    ],
  );

  const isLoading =
    brands.isLoading ||
    (brandId ? models.isLoading : false) ||
    (modelId ? generations.isLoading : false) ||
    colors.isLoading ||
    bodyTypes.isLoading ||
    transmissions.isLoading ||
    driveTypes.isLoading ||
    engineTypes.isLoading ||
    regions.isLoading ||
    (regionId ? cities.isLoading : false);

  return { maps, isLoading };
}
