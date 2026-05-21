import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { View } from "react-native";
import type { ListingsSchemas, WizardSchemas } from "@auto-tm/contracts";

import { useEditListing } from "../../../src/api/listings/useEditListing";
import { useListingDetail } from "../../../src/api/listings/useListingDetail";
import { useUploadQueue } from "../../../src/listings/uploadStaging/useUploadQueue";
import Step1Vin from "../../../src/listings/wizard/Step1Vin";
import Step2Photos from "../../../src/listings/wizard/Step2Photos";
import Step3VehicleId from "../../../src/listings/wizard/Step3VehicleId";
import Step4Specs from "../../../src/listings/wizard/Step4Specs";
import Step5Price from "../../../src/listings/wizard/Step5Price";
import Step6Location from "../../../src/listings/wizard/Step6Location";
import Step7DescContact from "../../../src/listings/wizard/Step7DescContact";
import Step8Review from "../../../src/listings/wizard/Step8Review";
import { WizardLayout } from "../../../src/listings/wizard/WizardLayout";
import {
  buildMachineContext,
  createInitialState,
  wizardMachineReducer,
} from "../../../src/listings/wizard/wizardMachine";

import { useToast } from "@/components/ui/toast";
import { Text } from "@/components/ui/text";

const STEP_TITLES: Record<WizardSchemas.WizardStep, string> = {
  vin: "VIN or chassis number",
  photos: "Photos",
  vehicle: "Vehicle",
  specs: "Specs",
  price: "Price",
  location: "Car location",
  contact: "Description & contact",
  review: "Review",
};

function getStepTitle(step: WizardSchemas.WizardStep): string {
  return STEP_TITLES[step] ?? step;
}

function listingToPayload(
  listing: ListingsSchemas.ListingDetail,
): WizardSchemas.WizardDraftPayload {
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

const EMPTY_PAYLOAD = {} as WizardSchemas.WizardDraftPayload;

function buildPayloadPhotos(
  photos: ReturnType<typeof useUploadQueue>["photos"],
): NonNullable<WizardSchemas.WizardDraftPayload["photos"]> {
  return photos
    .filter((p): p is typeof p & { key: string } => !!p.key)
    .map((p) => ({
      photoId: p.photoId,
      key: p.key,
      sortOrder: p.sortOrder,
    }));
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const { show } = useToast();
  const listingId = id as string;

  const { data: listing } = useListingDetail(listingId);
  const editListing = useEditListing();
  const [machineState, dispatch] = useReducer(
    wizardMachineReducer,
    createInitialState(),
  );
  const [attemptedSteps, setAttemptedSteps] = useState<
    Partial<Record<WizardSchemas.WizardStep, boolean>>
  >({});

  const editPayload = useMemo(() => {
    if (!listing) return EMPTY_PAYLOAD;
    return listingToPayload(listing);
  }, [listing]);

  const uploadQueue = useUploadQueue(
    listing ? `edit-${listingId}` : "",
    editPayload,
  );

  useEffect(() => {
    if (listing) {
      dispatch({
        type: "INIT",
        draftId: null,
        listingId: listing.id,
        mode: "edit",
        entryStep: "review",
        payload: listingToPayload(listing),
      });
    }
  }, [listing]);

  // Sync upload queue photos into payload so wizard validation and review see changes
  useEffect(() => {
    const photosFromQueue = buildPayloadPhotos(uploadQueue.photos);
    dispatch({
      type: "UPDATE_FIELDS",
      updates: { photos: photosFromQueue },
    });
  }, [uploadQueue.photos]);

  const ctx = buildMachineContext(machineState);

  const handlePayloadChange = useCallback(
    (updates: Partial<WizardSchemas.WizardDraftPayload>) => {
      dispatch({ type: "UPDATE_FIELDS", updates });
    },
    [],
  );

  const handleReturnToReview = useCallback(() => {
    if (!ctx.canContinue) {
      setAttemptedSteps((current) =>
        current[machineState.currentStep]
          ? current
          : { ...current, [machineState.currentStep]: true },
      );
      return;
    }
    dispatch({ type: "GO_TO_STEP", step: "review" });
  }, [ctx.canContinue, machineState.currentStep]);

  const handleSave = useCallback(() => {
    if (!ctx.canPublish) return;

    const patch: ListingsSchemas.EditListingRequest = {
      priceAmount: machineState.payload.priceAmount,
      priceCurrency: machineState.payload.priceCurrency,
      description: machineState.payload.description,
      condition: machineState.payload.condition,
      mileageKm: machineState.payload.mileageKm,
      colorId: machineState.payload.colorId,
      bodyTypeId: machineState.payload.bodyTypeId,
      transmissionId: machineState.payload.transmissionId,
      driveTypeId: machineState.payload.driveTypeId,
      engineTypeId: machineState.payload.engineTypeId,
      enginePower: machineState.payload.enginePower,
      regionId: machineState.payload.regionId,
      cityId: machineState.payload.cityId,
      locationText: machineState.payload.locationText,
      contactPhone: machineState.payload.contactPhone,
      allowCalls: machineState.payload.allowCalls,
      allowChat: machineState.payload.allowChat,
      acceptsExchange: machineState.payload.acceptsExchange,
      installmentAvailable: machineState.payload.installmentAvailable,
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
  }, [ctx.canPublish, editListing, listingId, machineState.payload, show]);

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

  const currentStep = machineState.currentStep;
  const disabledReason =
    !ctx.isLastStep &&
    !ctx.canContinue &&
    attemptedSteps[currentStep] &&
    ctx.stepErrors.length > 0
      ? ctx.stepErrors[0]
      : undefined;

  return (
    <WizardLayout
      routeTitle="Edit listing"
      stepTitle={getStepTitle(currentStep)}
      stepNumber={ctx.stepNumber}
      stepCount={ctx.stepCount}
      onBack={() => {}}
      onContinue={handleReturnToReview}
      onPublish={handleSave}
      onReturnToReview={handleReturnToReview}
      onDiscard={handleDiscard}
      mode={machineState.mode}
      editDetourActive={ctx.editDetourActive}
      canContinue={ctx.canContinue && !editListing.isPending}
      canPublish={ctx.canPublish && !editListing.isPending}
      canGoBack={ctx.canGoBack}
      isLastStep={ctx.isLastStep}
      saveStatus={editListing.isPending ? "saving" : "idle"}
      saveError={null}
      onRetrySave={() => {}}
      progressPercent={ctx.progressPercent}
      disabledReason={disabledReason}
      publishLabel="Save changes"
      discardTitle="Leave edit mode?"
      discardDescription="Any unsaved changes will be lost."
      isDiscarding={false}
      discardError={null}
    >
      {currentStep === "vin" && (
        <Step1Vin
          payload={machineState.payload}
          onChange={handlePayloadChange}
          fieldErrors={ctx.fieldErrors}
          disabled={true}
        />
      )}
      {currentStep === "photos" && (
        <Step2Photos
          photos={uploadQueue.photos}
          onAddPhoto={uploadQueue.addPhoto}
          onRemovePhoto={uploadQueue.removePhoto}
          onReorderPhotos={uploadQueue.reorderPhotos}
          onRetryPhoto={uploadQueue.retryPhoto}
          isCompressing={uploadQueue.isCompressing}
          isUploading={uploadQueue.isUploading}
          fieldErrors={ctx.fieldErrors}
        />
      )}
      {currentStep === "vehicle" && (
        <Step3VehicleId
          payload={machineState.payload}
          onChange={handlePayloadChange}
          fieldErrors={ctx.fieldErrors}
          disabled={true}
          showErrors={attemptedSteps.vehicle === true}
        />
      )}
      {currentStep === "specs" && (
        <Step4Specs
          payload={machineState.payload}
          onChange={handlePayloadChange}
          fieldErrors={ctx.fieldErrors}
        />
      )}
      {currentStep === "price" && (
        <Step5Price
          payload={machineState.payload}
          onChange={handlePayloadChange}
          fieldErrors={ctx.fieldErrors}
        />
      )}
      {currentStep === "location" && (
        <Step6Location
          payload={machineState.payload}
          onChange={handlePayloadChange}
          fieldErrors={ctx.fieldErrors}
        />
      )}
      {currentStep === "contact" && (
        <Step7DescContact
          payload={machineState.payload}
          onChange={handlePayloadChange}
          fieldErrors={ctx.fieldErrors}
          defaultPhone={listing.contactPhone ?? ""}
        />
      )}
      {currentStep === "review" && (
        <Step8Review
          payload={machineState.payload}
          validatedSteps={machineState.validatedSteps}
          onGoToStep={(step) => dispatch({ type: "GO_TO_STEP", step })}
          photos={uploadQueue.photos}
        />
      )}
    </WizardLayout>
  );
}
