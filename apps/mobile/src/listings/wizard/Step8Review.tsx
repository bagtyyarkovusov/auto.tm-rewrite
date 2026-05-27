import { useState } from "react";
import { View, Image, ScrollView, Pressable } from "react-native";
import { Check, AlertCircle, Eye, ListChecks } from "lucide-react-native";
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
import { getPhotoUri } from "../uploadStaging/photoUri";

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

type ViewMode = "checklist" | "preview";

export default function Step8Review({
  payload,
  validatedSteps,
  onGoToStep,
  photos,
}: Step8ReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("checklist");

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
  const colorHex = colorsData?.items.find((c) => c.id === payload.colorId)?.hex;
  const bodyTypeName = bodyTypesData?.items.find((b) => b.id === payload.bodyTypeId)?.name;
  const transmissionName = transmissionsData?.items.find((t) => t.id === payload.transmissionId)?.name;
  const driveTypeName = driveTypesData?.items.find((d) => d.id === payload.driveTypeId)?.name;
  const engineTypeName = engineTypesData?.items.find((e) => e.id === payload.engineTypeId)?.name;
  const regionName = regionsData?.items.find((r) => r.id === payload.regionId)?.name;
  const cityName = citiesData?.items.find((c) => c.id === payload.cityId)?.name;

  const uploadedPhotos = photos.filter((p) => p.key);
  const hasPhotos = uploadedPhotos.length > 0;

  return (
    <View className="gap-4 py-5">
      {/* Toggle */}
      <View className="flex-row rounded-lg bg-muted p-1">
        <Pressable
          onPress={() => setViewMode("checklist")}
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === "checklist" }}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-md py-2 ${
            viewMode === "checklist" ? "bg-card shadow-sm" : "bg-transparent"
          }`}
        >
          <Icon as={ListChecks} className={`size-4 ${viewMode === "checklist" ? "text-foreground" : "text-muted-foreground"}`} />
          <Text className={`text-sm font-medium ${viewMode === "checklist" ? "text-foreground" : "text-muted-foreground"}`}>
            Checklist
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("preview")}
          accessibilityRole="button"
          accessibilityState={{ selected: viewMode === "preview" }}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-md py-2 ${
            viewMode === "preview" ? "bg-card shadow-sm" : "bg-transparent"
          }`}
        >
          <Icon as={Eye} className={`size-4 ${viewMode === "preview" ? "text-foreground" : "text-muted-foreground"}`} />
          <Text className={`text-sm font-medium ${viewMode === "preview" ? "text-foreground" : "text-muted-foreground"}`}>
            Preview
          </Text>
        </Pressable>
      </View>

      {viewMode === "checklist" ? (
        <ChecklistView
          payload={payload}
          validatedSteps={validatedSteps}
          onGoToStep={onGoToStep}
          uploadedPhotos={uploadedPhotos}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          bodyTypeName={bodyTypeName}
          transmissionName={transmissionName}
          driveTypeName={driveTypeName}
          engineTypeName={engineTypeName}
          regionName={regionName}
          cityName={cityName}
        />
      ) : (
        <PreviewView
          payload={payload}
          brandName={brandName}
          modelName={modelName}
          colorName={colorName}
          colorHex={colorHex}
          bodyTypeName={bodyTypeName}
          transmissionName={transmissionName}
          driveTypeName={driveTypeName}
          engineTypeName={engineTypeName}
          regionName={regionName}
          cityName={cityName}
          uploadedPhotos={uploadedPhotos}
          hasPhotos={hasPhotos}
        />
      )}
    </View>
  );
}

function ChecklistView({
  payload,
  validatedSteps,
  onGoToStep,
  uploadedPhotos,
  brandName,
  modelName,
  colorName,
  bodyTypeName,
  transmissionName,
  driveTypeName,
  engineTypeName,
  regionName,
  cityName,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  validatedSteps: WizardSchemas.WizardStep[];
  onGoToStep: (step: WizardSchemas.WizardStep) => void;
  uploadedPhotos: StagedPhoto[];
  brandName?: string;
  modelName?: string;
  colorName?: string;
  bodyTypeName?: string;
  transmissionName?: string;
  driveTypeName?: string;
  engineTypeName?: string;
  regionName?: string;
  cityName?: string;
}) {
  return (
    <View className="gap-4">
      {/* Vehicle */}
      <ReviewSection
        title={STEP_LABELS.vehicle}
        isValid={validatedSteps.includes("vehicle")}
        onEdit={() => onGoToStep("vehicle")}
      >
        <Text className="text-sm text-foreground">
          {brandName && modelName ? `${payload.year} ${brandName} ${modelName}` : "Not set"}
        </Text>
        {payload.generationId && (
          <Text className="text-sm text-muted-foreground">Generation: {payload.generationId}</Text>
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
          <Text className="text-sm text-muted-foreground">Color: {colorName}</Text>
        )}
        {bodyTypeName && (
          <Text className="text-sm text-muted-foreground">Body: {bodyTypeName}</Text>
        )}
        {transmissionName && (
          <Text className="text-sm text-muted-foreground">Transmission: {transmissionName}</Text>
        )}
        {driveTypeName && (
          <Text className="text-sm text-muted-foreground">Drive: {driveTypeName}</Text>
        )}
        {engineTypeName && (
          <Text className="text-sm text-muted-foreground">Engine: {engineTypeName}</Text>
        )}
        {payload.enginePower && (
          <Text className="text-sm text-muted-foreground">Power: {payload.enginePower} hp</Text>
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
          <Text className="text-sm text-muted-foreground">Exchange possible</Text>
        )}
        {payload.installmentAvailable && (
          <Text className="text-sm text-muted-foreground">Installment available</Text>
        )}
      </ReviewSection>

      {/* Location */}
      <ReviewSection
        title={STEP_LABELS.location}
        isValid={validatedSteps.includes("location")}
        onEdit={() => onGoToStep("location")}
      >
        <Text className="text-sm text-foreground">
          {regionName && cityName ? `${regionName}, ${cityName}` : "Not set"}
        </Text>
        {payload.locationText && (
          <Text className="text-sm text-muted-foreground">{payload.locationText}</Text>
        )}
      </ReviewSection>

      {/* Contact */}
      <ReviewSection
        title={STEP_LABELS.contact}
        isValid={validatedSteps.includes("contact")}
        onEdit={() => onGoToStep("contact")}
      >
        <Text className="text-sm text-foreground" numberOfLines={2}>
          {payload.description || "No description"}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {payload.allowCalls ? "Calls allowed" : "No calls"} ·{" "}
          {payload.allowChat ? "Chat allowed" : "No chat"}
        </Text>
        {payload.contactPhone && (
          <Text className="text-sm text-muted-foreground">
            Phone: {payload.contactPhone}
          </Text>
        )}
      </ReviewSection>
    </View>
  );
}

function PreviewView({
  payload,
  brandName,
  modelName,
  colorName,
  colorHex,
  bodyTypeName,
  transmissionName,
  driveTypeName,
  engineTypeName,
  regionName,
  cityName,
  uploadedPhotos,
  hasPhotos,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  brandName?: string;
  modelName?: string;
  colorName?: string;
  colorHex?: string | null;
  bodyTypeName?: string;
  transmissionName?: string;
  driveTypeName?: string;
  engineTypeName?: string;
  regionName?: string;
  cityName?: string;
  uploadedPhotos: StagedPhoto[];
  hasPhotos: boolean;
}) {
  return (
    <View className="gap-4">
      {/* Photo carousel */}
      <View className="rounded-xl overflow-hidden bg-muted">
        {hasPhotos && uploadedPhotos[0] && getPhotoUri(uploadedPhotos[0], "detail") ? (
          <Image
            source={{ uri: getPhotoUri(uploadedPhotos[0], "detail") }}
            className="w-full aspect-[4/3]"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-[4/3] items-center justify-center bg-muted">
            <Icon as={AlertCircle} className="size-8 text-muted-foreground" />
            <Text className="mt-2 text-sm text-muted-foreground">No photos</Text>
          </View>
        )}
        {uploadedPhotos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 px-2">
            <View className="flex-row gap-2">
              {uploadedPhotos.slice(1).map((photo) => {
                const uri = getPhotoUri(photo, "thumbnail");
                return uri ? (
                  <Image
                    key={photo.photoId}
                    source={{ uri }}
                    className="h-16 w-16 rounded-lg"
                    resizeMode="cover"
                  />
                ) : null;
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Title + Price */}
      <View className="gap-2">
        <Text className="text-2xl font-heading text-foreground">
          {brandName && modelName
            ? `${payload.year} ${brandName} ${modelName}`
            : "Vehicle not specified"}
        </Text>
        <Text className="text-xl font-semibold text-primary">
          {payload.priceAmount
            ? `${payload.priceAmount.toLocaleString()} ${payload.priceCurrency}`
            : "Price not set"}
        </Text>
      </View>

      {/* Location */}
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm text-muted-foreground">
          {regionName && cityName ? `${regionName}, ${cityName}` : "Location not set"}
        </Text>
        {payload.locationText && (
          <Text className="text-sm text-muted-foreground">· {payload.locationText}</Text>
        )}
      </View>

      {/* Specs grid */}
      <View className="rounded-xl border border-border p-4 gap-3">
        <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Specifications
        </Text>
        <View className="flex-row flex-wrap">
          <SpecItem label="Condition" value={payload.condition === "new" ? "New" : "Used"} />
          {payload.mileageKm !== undefined && payload.mileageKm !== null && (
            <SpecItem label="Mileage" value={`${payload.mileageKm.toLocaleString()} km`} />
          )}
          {colorName && <SpecItem label="Color" value={colorName} colorHex={colorHex} />}
          {bodyTypeName && <SpecItem label="Body" value={bodyTypeName} />}
          {transmissionName && <SpecItem label="Transmission" value={transmissionName} />}
          {driveTypeName && <SpecItem label="Drive" value={driveTypeName} />}
          {engineTypeName && <SpecItem label="Engine" value={engineTypeName} />}
          {payload.enginePower && <SpecItem label="Power" value={`${payload.enginePower} hp`} />}
        </View>
      </View>

      {/* Description */}
      {payload.description && (
        <View className="rounded-xl border border-border p-4 gap-2">
          <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Description
          </Text>
          <Text className="text-sm text-foreground leading-relaxed">
            {payload.description}
          </Text>
        </View>
      )}

      {/* Contact */}
      <View className="rounded-xl border border-border p-4 gap-2">
        <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Contact
        </Text>
        <Text className="text-sm text-foreground">
          {payload.allowCalls ? "Phone calls accepted" : "No phone calls"}
        </Text>
        {payload.contactPhone && (
          <Text className="text-sm text-muted-foreground">{payload.contactPhone}</Text>
        )}
      </View>

      {/* Terms */}
      {(payload.acceptsExchange || payload.installmentAvailable) && (
        <View className="flex-row gap-2 flex-wrap">
          {payload.acceptsExchange && (
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-xs font-medium text-foreground">Exchange possible</Text>
            </View>
          )}
          {payload.installmentAvailable && (
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-xs font-medium text-foreground">Installment</Text>
            </View>
          )}
        </View>
      )}

      <Text className="text-xs text-muted-foreground text-center py-2">
        This is how buyers will see your listing
      </Text>
    </View>
  );
}

function SpecItem({
  label,
  value,
  colorHex,
}: {
  label: string;
  value: string;
  colorHex?: string | null;
}) {
  return (
    <View className="w-1/2 py-2 pr-4">
      <Text className="text-xs text-muted-foreground mb-0.5">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {colorHex && (
          <View
            className="h-4 w-4 rounded-full border border-border"
            style={{ backgroundColor: colorHex }}
          />
        )}
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {value}
        </Text>
      </View>
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
    <View className="rounded-xl border border-border p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {isValid ? (
            <Icon as={Check} className="size-4 text-success-500" />
          ) : (
            <Icon as={AlertCircle} className="size-4 text-destructive" />
          )}
          <Text className="text-sm font-medium text-foreground">{title}</Text>
        </View>
        <Button variant="ghost" size="sm" onPress={onEdit} accessibilityLabel={`Edit ${title}`}>
          <Text className="text-sm text-primary font-medium">Edit</Text>
        </Button>
      </View>
      <View className="mt-2 gap-0.5 pl-6">{children}</View>
    </View>
  );
}
