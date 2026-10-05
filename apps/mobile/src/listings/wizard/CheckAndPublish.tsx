import { Image } from "expo-image";
import { Camera } from "lucide-react-native";
import { Enums, type WizardSchemas } from "@auto-tm/contracts";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { useBrands } from "../../api/catalog/useBrands";
import { findCityInGroups, useCityGroups } from "../../api/catalog/useCityGroups";
import { useEngineTypes } from "../../api/catalog/useEngineTypes";
import { useModels } from "../../api/catalog/useModels";
import { useTransmissions } from "../../api/catalog/useTransmissions";
import { localeTag } from "../../i18n/resources";
import { listingSpecLine } from "../feed/listingSpecLine";
import { getPhotoUri } from "../uploadStaging/photoUri";
import type { StagedPhoto } from "../uploadStaging/types";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export interface CheckAndPublishProps {
  payload: WizardSchemas.WizardDraftPayload;
  validatedSteps: WizardSchemas.WizardStep[];
  /** Opens a step from Check; Done on that step returns here. */
  onChangeStep: (step: WizardSchemas.WizardStep) => void;
  /** Every picked photo in order, the cover first. */
  photos: StagedPhoto[];
}

/** The catalog names and formatted values that the preview and the section summaries share. */
function useCheckValues(payload: WizardSchemas.WizardDraftPayload) {
  const { t, i18n } = useTranslation();
  const { data: brands } = useBrands();
  const { data: models } = useModels(payload.brandId ?? "");
  const { data: transmissions } = useTransmissions();
  const { data: engineTypes } = useEngineTypes();
  const { groups: cityGroups } = useCityGroups();

  const brandName = brands?.items.find((b) => b.id === payload.brandId)?.name;
  const modelName = models?.items.find((m) => m.id === payload.modelId)?.name;
  const identity = [brandName, modelName].filter(Boolean).join(" ");
  const isNew = payload.condition === Enums.ListingCondition.New;
  const specs = listingSpecLine({
    mileageKm: isNew ? null : payload.mileageKm,
    transmissionName: transmissions?.items.find((x) => x.id === payload.transmissionId)?.name,
    engineTypeName: engineTypes?.items.find((x) => x.id === payload.engineTypeId)?.name,
    locale: i18n.language,
    kmLabel: t("km"),
  });

  return {
    /** "Brand Model, year", as the Listing card titles it. */
    title: [identity, payload.year].filter((value) => value != null && value !== "").join(", "),
    /** The amount in the currency the seller chose; buyers see it converted to TMT. */
    price:
      payload.priceAmount != null
        ? `${payload.priceAmount.toLocaleString(localeTag(i18n.language))} ${payload.priceCurrency ?? "TMT"}`
        : "",
    /** "New" or the mileage, then gearbox and fuel. */
    specs: [isNew ? t("new") : null, specs].filter(Boolean).join(" · "),
    cityName: findCityInGroups(cityGroups, payload.cityId)?.city.name,
  };
}

type CheckValues = ReturnType<typeof useCheckValues>;

/** The Listing card buyers will see in Results, built from the draft. */
function PreviewCard({ values, photos }: { values: CheckValues; photos: StagedPhoto[] }) {
  const { t } = useTranslation();
  const cover = photos[0];
  const coverUri = cover ? getPhotoUri(cover, "list") : undefined;

  return (
    <View testID="check-preview" className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className="h-[170px] bg-muted">
        {coverUri ? (
          // expo-image takes no className, so its size goes through style.
          <Image
            testID="check-preview-cover"
            source={{ uri: coverUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="h-full items-center justify-center">
            <Text className="text-xs text-muted-foreground">{t("noPhotos")}</Text>
          </View>
        )}
        {photos.length > 1 ? (
          <View
            accessibilityLabel={t("resultsPhotoCount", { count: photos.length })}
            className="absolute bottom-2 left-2 flex-row items-center gap-1 rounded-md bg-black/60 px-2 py-1"
          >
            <Icon as={Camera} className="size-3 text-white" />
            <Text className="text-xs text-white">{photos.length}</Text>
          </View>
        ) : null}
      </View>
      <View className="gap-0.5 px-4 py-3">
        <Text className="text-xl font-heading text-foreground" numberOfLines={1}>
          {values.price || "—"}
        </Text>
        {values.specs ? (
          <Text className="text-sm text-foreground" numberOfLines={1}>{values.specs}</Text>
        ) : null}
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {values.title || "—"}
        </Text>
        <Text className="pt-1 text-xs text-muted-foreground" numberOfLines={1}>
          {[values.cityName, t("resultsToday")].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </View>
  );
}

/** The last step of the Sell wizard: the Listing as buyers will see it, and what is left to fix. */
export default function CheckAndPublish({ payload, photos }: CheckAndPublishProps) {
  const { t } = useTranslation();
  const values = useCheckValues(payload);

  return (
    <View className="gap-3 py-5">
      <PreviewCard values={values} photos={photos} />
      <Text className="text-center text-xs text-muted-foreground">{t("thisIsHowBuyersSee")}</Text>
    </View>
  );
}
