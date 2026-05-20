import { View } from "react-native";
import { Check, AlertCircle } from "lucide-react-native";
import type { WizardSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { useModels } from "../../api/catalog/useModels";
import { useColors } from "../../api/catalog/useColors";
import { useBodyTypes } from "../../api/catalog/useBodyTypes";
import { useTransmissions } from "../../api/catalog/useTransmissions";
import { useDriveTypes } from "../../api/catalog/useDriveTypes";
import { useEngineTypes } from "../../api/catalog/useEngineTypes";
import { useRegions } from "../../api/catalog/useRegions";
import { useCities } from "../../api/catalog/useCities";
import type { StagedPhoto } from "../uploadStaging/types";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

interface Step8ReviewProps {
  payload: WizardSchemas.WizardDraftPayload;
  validatedSteps: WizardSchemas.WizardStep[];
  onGoToStep: (step: WizardSchemas.WizardStep) => void;
  photos: StagedPhoto[];
}

const STEP_LABELS: Record<WizardSchemas.WizardStep, string> = {
  vin: "VIN",
  photos: "Photos",
  vehicle: "Vehicle",
  specs: "Specs",
  price: "Price",
  location: "Location",
  contact: "Description & contact",
  review: "Review",
};

export default function Step8Review({
  payload,
  validatedSteps,
  onGoToStep,
  photos,
}: Step8ReviewProps) {
  const { data: brandsData } = useBrands();
  const { data: modelsData } = useModels(payload.brandId ?? "");
  const { data: colorsData } = useColors();
  const { data: bodyTypesData } = useBodyTypes();
  const { data: transmissionsData } = useTransmissions();
  const { data: driveTypesData } = useDriveTypes();
  const { data: engineTypesData } = useEngineTypes();
  const { data: regionsData } = useRegions();
  const { data: citiesData } = useCities(payload.regionId ?? "");

  const brandName = brandsData?.items.find((b) => b.id === payload.brandId)?.name;
  const modelName = modelsData?.items.find((m) => m.id === payload.modelId)?.name;
  const colorName = colorsData?.items.find((c) => c.id === payload.colorId)?.name;
  const bodyTypeName = bodyTypesData?.items.find((b) => b.id === payload.bodyTypeId)?.name;
  const transmissionName = transmissionsData?.items.find((t) => t.id === payload.transmissionId)?.name;
  const driveTypeName = driveTypesData?.items.find((d) => d.id === payload.driveTypeId)?.name;
  const engineTypeName = engineTypesData?.items.find((e) => e.id === payload.engineTypeId)?.name;
  const regionName = regionsData?.items.find((r) => r.id === payload.regionId)?.name;
  const cityName = citiesData?.items.find((c) => c.id === payload.cityId)?.name;

  const uploadedPhotos = photos.filter((p) => p.key);

  return (
    <View className="gap-6 py-4">
      <View className="gap-2">
        <Text className="font-uber text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Review your listing
        </Text>
        <Text className="text-base leading-normal text-gray-600">
          Check everything is correct before publishing.
        </Text>
      </View>

      {/* Vehicle */}
      <ReviewSection
        title={STEP_LABELS.vehicle}
        isValid={validatedSteps.includes("vehicle")}
        onEdit={() => onGoToStep("vehicle")}
      >
        <Text className="text-sm text-foreground">
          {brandName} {modelName} {payload.year}
        </Text>
        {payload.generationId && (
          <Text className="text-sm text-gray-500">Generation ID: {payload.generationId}</Text>
        )}
      </ReviewSection>

      {/* Photos */}
      <ReviewSection
        title={STEP_LABELS.photos}
        isValid={validatedSteps.includes("photos")}
        onEdit={() => onGoToStep("photos")}
      >
        <Text className="text-sm text-foreground">
          {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? "s" : ""} uploaded
        </Text>
      </ReviewSection>

      {/* Specs */}
      <ReviewSection
        title={STEP_LABELS.specs}
        isValid={validatedSteps.includes("specs")}
        onEdit={() => onGoToStep("specs")}
      >
        <Text className="text-sm text-foreground">
          {payload.condition === "new" ? "New" : `Used, ${payload.mileageKm?.toLocaleString()} km`}
        </Text>
        {colorName && (
          <Text className="text-sm text-gray-500">Color: {colorName}</Text>
        )}
        {bodyTypeName && (
          <Text className="text-sm text-gray-500">Body: {bodyTypeName}</Text>
        )}
        {transmissionName && (
          <Text className="text-sm text-gray-500">Transmission: {transmissionName}</Text>
        )}
        {driveTypeName && (
          <Text className="text-sm text-gray-500">Drive: {driveTypeName}</Text>
        )}
        {engineTypeName && (
          <Text className="text-sm text-gray-500">Engine: {engineTypeName}</Text>
        )}
        {payload.enginePower && (
          <Text className="text-sm text-gray-500">Power: {payload.enginePower} hp</Text>
        )}
      </ReviewSection>

      {/* Price */}
      <ReviewSection
        title={STEP_LABELS.price}
        isValid={validatedSteps.includes("price")}
        onEdit={() => onGoToStep("price")}
      >
        <Text className="text-sm text-foreground">
          {payload.priceAmount?.toLocaleString()} {payload.priceCurrency}
        </Text>
        {payload.acceptsExchange && (
          <Text className="text-sm text-gray-500">Exchange possible</Text>
        )}
        {payload.installmentAvailable && (
          <Text className="text-sm text-gray-500">Installment available</Text>
        )}
      </ReviewSection>

      {/* Location */}
      <ReviewSection
        title={STEP_LABELS.location}
        isValid={validatedSteps.includes("location")}
        onEdit={() => onGoToStep("location")}
      >
        <Text className="text-sm text-foreground">
          {regionName}, {cityName}
        </Text>
        {payload.locationText && (
          <Text className="text-sm text-gray-500">{payload.locationText}</Text>
        )}
      </ReviewSection>

      {/* Contact */}
      <ReviewSection
        title={STEP_LABELS.contact}
        isValid={validatedSteps.includes("contact")}
        onEdit={() => onGoToStep("contact")}
      >
        <Text className="text-sm text-foreground" numberOfLines={2}>
          {payload.description}
        </Text>
        <Text className="text-sm text-gray-500">
          {payload.allowCalls ? "Calls allowed" : "No calls"} ·{" "}
          {payload.allowChat ? "Chat allowed" : "No chat"}
        </Text>
        {payload.contactPhone && (
          <Text className="text-sm text-gray-500">
            Phone: {payload.contactPhone}
          </Text>
        )}
      </ReviewSection>
    </View>
  );
}

function ReviewSection({
  title,
  isValid,
  onEdit,
  children,
}: {
  title: string;
  isValid: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-lg border border-gray-200 p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {isValid ? (
            <Icon as={Check} className="size-4 text-success" />
          ) : (
            <Icon as={AlertCircle} className="size-4 text-error" />
          )}
          <Text className="text-sm font-medium text-foreground">{title}</Text>
        </View>
        <Button variant="ghost" size="sm" onPress={onEdit}>
          <Text className="text-sm font-medium text-foreground underline">Edit</Text>
        </Button>
      </View>
      <View className="mt-2 gap-0.5 pl-6">{children}</View>
    </View>
  );
}
