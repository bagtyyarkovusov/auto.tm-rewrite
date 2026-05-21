import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { View } from "react-native";
import type { ListingsSchemas, WizardSchemas } from "@auto-tm/contracts";

import { useListingDetail } from "../../../src/api/listings/useListingDetail";
import { useUploadQueue } from "../../../src/listings/uploadStaging/useUploadQueue";
import {
  useSaveListingEdit,
  opLabel,
  type OpState,
} from "../../../src/listings/edit/useSaveListingEdit";
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
import { Button } from "@/components/ui/button";

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

function EditSaveErrorBanner({
  opStates,
  onRetry,
}: {
  opStates: Record<string, OpState>;
  onRetry: () => void;
}) {
  return (
    <View className="gap-2 rounded-lg bg-destructive/10 p-3">
      <Text className="text-sm font-medium text-destructive">
        Couldn't save all changes
      </Text>
      {Object.entries(opStates).map(([opId, state]) => (
        <Text key={opId} className="text-xs text-muted-foreground">
          {state === "succeeded"
            ? "✓"
            : state === "failed"
              ? "✗"
              : "·"}{" "}
          {opLabel(opId)}
        </Text>
      ))}
      <Button
        className="h-[52px] rounded-full"
        onPress={onRetry}
      >
        <Text className="text-background">Retry</Text>
      </Button>
    </View>
  );
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const { show } = useToast();
  const listingId = id as string;

  const { data: listing } = useListingDetail(listingId);
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

  const saveEdit = useSaveListingEdit(
    listingId,
    machineState.payload,
    uploadQueue.photos,
    listing?.media ?? [],
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

  const handleSave = useCallback(async () => {
    if (!ctx.canPublish) return;

    try {
      await saveEdit.save();
      show({ title: "Changes saved", variant: "success" });
      // Navigate to public detail; may 404 until downstream route ships
      router.replace(`/(public)/listings/${listingId}`);
    } catch {
      // Error state surfaced by saveEdit.error + per-op banner below
    }
  }, [ctx.canPublish, saveEdit, show, listingId]);

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

  // Compute upload status counts for chip + publishGate reason
  const uploadStatus = {
    inflight: uploadQueue.photos.filter((p) =>
      ["selected", "compressed", "presigned", "uploading"].includes(p.state),
    ).length,
    failed: uploadQueue.photos.filter((p) => p.state === "failed").length,
    total: uploadQueue.photos.length,
  };

  const disabledReason =
    ctx.isLastStep && !uploadQueue.publishGate.canPublish
      ? uploadStatus.failed > 0
        ? `${uploadStatus.failed} failed — retry or remove`
        : uploadStatus.inflight > 0
          ? `Wait for ${uploadStatus.inflight} photos to finish uploading`
          : (uploadQueue.publishGate.blockers[0] ?? "Cannot save yet")
      : !ctx.isLastStep &&
          !ctx.canContinue &&
          attemptedSteps[currentStep] &&
          ctx.stepErrors.length > 0
        ? ctx.stepErrors[0]
        : undefined;

  const saveStatus: "idle" | "saving" | "saved" | "error" =
    saveEdit.isPending ? "saving" : saveEdit.status === "failed" ? "error" : "idle";

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
      canContinue={ctx.canContinue && !saveEdit.isPending}
      canPublish={uploadQueue.publishGate.canPublish && !saveEdit.isPending}
      canGoBack={ctx.canGoBack}
      isLastStep={ctx.isLastStep}
      saveStatus={saveStatus}
      saveError={saveEdit.error ? "Couldn't save all changes" : null}
      onRetrySave={saveEdit.retry}
      progressPercent={ctx.progressPercent}
      disabledReason={disabledReason}
      uploadStatus={uploadStatus}
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
        <>
          <Step8Review
            payload={machineState.payload}
            validatedSteps={machineState.validatedSteps}
            onGoToStep={(step) => dispatch({ type: "GO_TO_STEP", step })}
            photos={uploadQueue.photos}
          />
          {saveEdit.status === "failed" && (
            <View className="mt-4">
              <EditSaveErrorBanner
                opStates={saveEdit.opStates}
                onRetry={saveEdit.retry}
              />
            </View>
          )}
        </>
      )}
    </WizardLayout>
  );
}
