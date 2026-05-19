import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useEditListing } from "../../../src/api/listings/useEditListing";
import { useListingDetail } from "../../../src/api/listings/useListingDetail";
import Step1Vin from "../../../src/listings/wizard/Step1Vin";
import Step3VehicleId from "../../../src/listings/wizard/Step3VehicleId";
import Step4Specs from "../../../src/listings/wizard/Step4Specs";
import Step5Price from "../../../src/listings/wizard/Step5Price";
import Step6Location from "../../../src/listings/wizard/Step6Location";
import Step7DescContact from "../../../src/listings/wizard/Step7DescContact";
import { WizardLayout } from "../../../src/listings/wizard/WizardLayout";
import type { WizardPayload } from "../../../src/listings/wizard/types";

import { useToast } from "@/components/ui/toast";
import { Text } from "@/components/ui/text";

const EDIT_STEPS = [
  "vin",
  "photos",
  "vehicle",
  "specs",
  "price",
  "location",
  "contact",
] as const;

type EditStep = (typeof EDIT_STEPS)[number];

const STEP_TITLES: Record<EditStep, string> = {
  vin: "VIN or chassis number",
  photos: "Photos",
  vehicle: "Vehicle",
  specs: "Specs",
  price: "Price",
  location: "Car location",
  contact: "Description & contact",
};

function getStepTitle(step: EditStep): string {
  return STEP_TITLES[step] ?? step;
}

function listingToPayload(listing: ListingsSchemas.ListingDetail): WizardPayload {
  return {
    vin: listing.vin,
    brandId: listing.brandId,
    modelId: listing.modelId,
    generationId: listing.generationId,
    year: listing.year,
    mileageKm: listing.mileageKm,
    condition: listing.condition,
    colorId: listing.colorId,
    bodyTypeId: listing.bodyTypeId,
    transmissionId: listing.transmissionId,
    driveTypeId: listing.driveTypeId,
    engineTypeId: listing.engineTypeId,
    enginePower: listing.enginePower,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    regionId: listing.regionId,
    cityId: listing.cityId,
    locationText: listing.locationText,
    description: listing.description,
    contactPhone: listing.contactPhone,
    allowCalls: listing.allowCalls,
    allowChat: listing.allowChat,
    acceptsExchange: listing.acceptsExchange,
    installmentAvailable: listing.installmentAvailable,
    photos: listing.media.map((m, i) => ({
      photoId: m.id,
      key: m.key,
      sortOrder: i,
    })),
  };
}

function ReadOnlyPhotos({ media }: { media: ListingsSchemas.ListingMedia[] }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {media.map((m, i) => (
        <View
          key={m.id}
          className="relative aspect-square w-[48%] overflow-hidden rounded-lg bg-muted"
        >
          <Image
            source={{ uri: m.variants.thumbnail }}
            className="h-full w-full"
            resizeMode="cover"
          />
          {i === 0 && (
            <View className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5">
              <Text className="text-[10px] font-medium text-primary-foreground">
                Cover
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const { show } = useToast();
  const listingId = id as string;

  const { data: listing } = useListingDetail(listingId);
  const editListing = useEditListing();

  const [currentStep, setCurrentStep] = useState<EditStep>("vin");
  const [payload, setPayload] = useState<WizardPayload>({});

  useEffect(() => {
    if (listing) {
      setPayload(listingToPayload(listing));
    }
  }, [listing]);

  function handlePayloadChange(updates: Partial<WizardPayload>) {
    setPayload((prev) => ({ ...prev, ...updates }));
  }

  function handleBack() {
    const idx = EDIT_STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(EDIT_STEPS[idx - 1]!);
    }
  }

  function handleContinue() {
    const idx = EDIT_STEPS.indexOf(currentStep);
    if (idx < EDIT_STEPS.length - 1) {
      setCurrentStep(EDIT_STEPS[idx + 1]!);
    }
  }

  function handleSave() {
    const patch: ListingsSchemas.EditListingRequest = {
      priceAmount: payload.priceAmount,
      priceCurrency: payload.priceCurrency,
      description: payload.description,
      condition: payload.condition,
      mileageKm: payload.mileageKm,
      colorId: payload.colorId,
      bodyTypeId: payload.bodyTypeId,
      transmissionId: payload.transmissionId,
      driveTypeId: payload.driveTypeId,
      engineTypeId: payload.engineTypeId,
      enginePower: payload.enginePower,
      regionId: payload.regionId,
      cityId: payload.cityId,
      locationText: payload.locationText,
      contactPhone: payload.contactPhone,
      allowCalls: payload.allowCalls,
      allowChat: payload.allowChat,
      acceptsExchange: payload.acceptsExchange,
      installmentAvailable: payload.installmentAvailable,
    };

    editListing.mutate(
      { listingId, patch },
      {
        onSuccess: () => {
          show({ title: "Changes saved", variant: "success" });
          router.back();
        },
      },
    );
  }

  function handleDiscard() {
    router.back();
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  const currentIdx = EDIT_STEPS.indexOf(currentStep);
  const isLastStep = currentIdx === EDIT_STEPS.length - 1;

  return (
    <WizardLayout
      routeTitle="Edit listing"
      stepTitle={getStepTitle(currentStep)}
      stepNumber={currentIdx + 1}
      stepCount={EDIT_STEPS.length}
      onBack={handleBack}
      onContinue={handleContinue}
      onPublish={handleSave}
      onDiscard={handleDiscard}
      canContinue={true}
      canPublish={true}
      canGoBack={currentIdx > 0}
      isLastStep={isLastStep}
      saveStatus={editListing.isPending ? "saving" : "idle"}
      saveError={null}
      onRetrySave={() => {}}
      progressPercent={((currentIdx + 1) / EDIT_STEPS.length) * 100}
      publishLabel="Save changes"
      discardTitle="Leave edit mode?"
      discardDescription="Any unsaved changes will be lost."
    >
      {currentStep === "vin" && (
        <Step1Vin
          payload={payload}
          onChange={handlePayloadChange}
          disabled={true}
        />
      )}
      {currentStep === "photos" && (
        <View className="gap-4 py-4">
          <Text className="text-sm text-muted-foreground">
            Photos cannot be changed after publishing. To update photos, create
            a new listing.
          </Text>
          <ReadOnlyPhotos media={listing.media} />
        </View>
      )}
      {currentStep === "vehicle" && (
        <Step3VehicleId
          payload={payload}
          onChange={handlePayloadChange}
          disabled={true}
        />
      )}
      {currentStep === "specs" && (
        <Step4Specs payload={payload} onChange={handlePayloadChange} />
      )}
      {currentStep === "price" && (
        <Step5Price payload={payload} onChange={handlePayloadChange} />
      )}
      {currentStep === "location" && (
        <Step6Location payload={payload} onChange={handlePayloadChange} />
      )}
      {currentStep === "contact" && (
        <Step7DescContact payload={payload} onChange={handlePayloadChange} />
      )}
    </WizardLayout>
  );
}
