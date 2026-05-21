import { PlusCircle } from "lucide-react-native";
import { type Href, router, useNavigation } from "expo-router";
import { useEffect, useReducer, useState, useCallback, useMemo } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WizardSchemas } from "@auto-tm/contracts";

import { useCreateDraft } from "../../src/api/listings/useCreateDraft";
import { useDiscardDraft } from "../../src/api/listings/useDiscardDraft";
import { useMyDrafts } from "../../src/api/listings/useMyDrafts";
import { usePublishDraft } from "../../src/api/listings/usePublishDraft";
import { deleteDraftDir } from "../../src/listings/uploadStaging/stagingDir";
import { useUploadQueue } from "../../src/listings/uploadStaging/useUploadQueue";
import {
  wizardMachineReducer,
  createInitialState,
  buildMachineContext,
} from "../../src/listings/wizard/wizardMachine";
import { WizardLayout } from "../../src/listings/wizard/WizardLayout";
import { useWizardAutosave } from "../../src/listings/wizard/useWizardAutosave";
import { useAuth } from "../../src/auth/useAuth";
import { loadAuthSession } from "../../src/auth/session";
import { SignInDialog } from "../../components/auth/SignInDialog";
import Step1Vin from "../../src/listings/wizard/Step1Vin";
import Step2Photos from "../../src/listings/wizard/Step2Photos";
import Step3VehicleId from "../../src/listings/wizard/Step3VehicleId";
import Step4Specs from "../../src/listings/wizard/Step4Specs";
import Step5Price from "../../src/listings/wizard/Step5Price";
import Step6Location from "../../src/listings/wizard/Step6Location";
import Step7DescContact from "../../src/listings/wizard/Step7DescContact";
import Step8Review from "../../src/listings/wizard/Step8Review";


import { useToast } from "@/components/ui/toast";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const ROUTE_TITLE = "Sell car";

const STEP_TITLES: Record<WizardSchemas.WizardStep, string> = {
  vin: "VIN or chassis number",
  photos: "Add photos",
  vehicle: "Vehicle",
  specs: "Specs",
  price: "Price",
  location: "Car location",
  contact: "Description & contact",
  review: "Review",
};

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

export default function SellScreen() {
  const { isAuthenticated } = useAuth();
  const { show } = useToast();
  const navigation = useNavigation();
  const [showSignIn, setShowSignIn] = useState(false);
  const [machineState, dispatch] = useReducer(
    wizardMachineReducer,
    createInitialState(),
  );
  const [attemptedSteps, setAttemptedSteps] = useState<
    Partial<Record<WizardSchemas.WizardStep, boolean>>
  >({});
  const [defaultPhone, setDefaultPhone] = useState("");

  useEffect(() => {
    loadAuthSession().then((s) => setDefaultPhone(s?.user.phone ?? ""));
  }, []);

  // Hide the bottom tab bar while the wizard is open — the wizard is a focused
  // flow that should not advertise navigation to other tabs.
  const inWizard =
    machineState.status !== "idle" && machineState.draftId !== null;
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: inWizard
        ? { display: "none" as const }
        : undefined,
    });
  }, [inWizard, navigation]);

  const { data: draftsData, isPending: draftsLoading } = useMyDrafts({
    enabled: !!isAuthenticated,
  });
  const createDraft = useCreateDraft();
  const publishDraft = usePublishDraft();
  const discardDraft = useDiscardDraft();

  const { save, forceSave, retrySave, saveStatus, saveError } =
    useWizardAutosave(machineState.draftId ?? undefined);
  const uploadQueue = useUploadQueue(
    machineState.draftId ? `draft-${machineState.draftId}` : "",
    machineState.payload,
  );

  const ctx = buildMachineContext(machineState);

  // Sync upload queue photos into payload
  useEffect(() => {
    const photosFromQueue = buildPayloadPhotos(uploadQueue.photos);
    dispatch({
      type: "UPDATE_FIELDS",
      updates: {
        photos: photosFromQueue,
      },
    });
  }, [uploadQueue.photos]);

  // Stable fingerprint of the photo queue so photo-only bursts trigger autosave
  const photoFingerprint = useMemo(
    () =>
      uploadQueue.photos
        .map((p) => `${p.photoId}:${p.key ?? "pending"}:${p.sortOrder}`)
        .join("|"),
    [uploadQueue.photos],
  );

  // Autosave when payload changes (photos handled via fingerprint above)
  useEffect(() => {
    if (!machineState.draftId || machineState.status !== "step") return;
    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...machineState.payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: machineState.validatedSteps,
    };
    save(fullPayload);
  }, [
    machineState.draftId,
    machineState.status,
    machineState.payload.vin,
    machineState.payload.brandId,
    machineState.payload.modelId,
    machineState.payload.generationId,
    machineState.payload.year,
    machineState.payload.mileageKm,
    machineState.payload.condition,
    machineState.payload.colorId,
    machineState.payload.bodyTypeId,
    machineState.payload.transmissionId,
    machineState.payload.driveTypeId,
    machineState.payload.engineTypeId,
    machineState.payload.enginePower,
    machineState.payload.priceAmount,
    machineState.payload.priceCurrency,
    machineState.payload.regionId,
    machineState.payload.cityId,
    machineState.payload.locationText,
    machineState.payload.description,
    machineState.payload.contactPhone,
    machineState.payload.allowCalls,
    machineState.payload.allowChat,
    machineState.payload.acceptsExchange,
    machineState.payload.installmentAvailable,
    machineState.validatedSteps,
    photoFingerprint,
  ]);

  const handleStartListing = useCallback(() => {
    if (!isAuthenticated && !__DEV__) {
      setShowSignIn(true);
      return;
    }

    const existingDraft = draftsData?.items?.[0];
    if (existingDraft) {
      return;
    }

    handleCreateNewDraft();
  }, [isAuthenticated, draftsData]);

  const handleCreateNewDraft = useCallback(() => {
    if (!isAuthenticated && !__DEV__) {
      setShowSignIn(true);
      return;
    }

    createDraft.mutate(undefined, {
      onSuccess: (draft) => {
        dispatch({
          type: "INIT",
          draftId: draft.id,
          payload: {
            currentStep: 1,
            allowCalls: true,
            allowChat: true,
          },
        });
      },
    });
  }, [isAuthenticated, createDraft]);

  const handleContinueDraft = useCallback(
    (draft: NonNullable<typeof draftsData>["items"][number]) => {
      dispatch({
        type: "INIT",
        draftId: draft.id,
        payload: {
          ...draft.payload,
          allowCalls: draft.payload.allowCalls ?? true,
          allowChat: draft.payload.allowChat ?? true,
        },
      });
    },
    [],
  );

  const handleBack = useCallback(() => {
    dispatch({ type: "BACK" });
    // Force save on navigation
    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...machineState.payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: machineState.validatedSteps,
    };
    void forceSave(fullPayload);
  }, [machineState.payload, machineState.validatedSteps, uploadQueue.photos, forceSave]);

  const handleContinue = useCallback(() => {
    if (!ctx.canContinue) {
      setAttemptedSteps((current) =>
        current[machineState.currentStep]
          ? current
          : { ...current, [machineState.currentStep]: true },
      );
      return;
    }

    dispatch({ type: "NEXT" });
    // Force save on navigation
    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...machineState.payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: machineState.validatedSteps,
    };
    void forceSave(fullPayload);
  }, [ctx.canContinue, machineState, uploadQueue.photos, forceSave]);

  const handleSkipVin = useCallback(() => {
    dispatch({ type: "UPDATE_FIELDS", updates: { vin: undefined } });
    dispatch({ type: "NEXT" });
  }, []);

  const handlePublish = useCallback(async () => {
    if (!machineState.draftId) return;

    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...machineState.payload,
      description: machineState.payload.description?.trim(),
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: machineState.validatedSteps,
    };

    dispatch({ type: "PUBLISH_START" });

    try {
      await forceSave(fullPayload);
      const result = await publishDraft.mutateAsync(machineState.draftId);
      dispatch({ type: "PUBLISH_SUCCESS", listingId: result.id });
      show({
        title: "Listing published",
        variant: "success",
      });
      router.push(`/(public)/listings/${result.id}` as Href);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to publish listing";
      dispatch({ type: "PUBLISH_ERROR", error: message });
      show({ title: message, variant: "destructive" });
    }
  }, [machineState, uploadQueue.photos, forceSave, publishDraft, show]);

  const handleDiscard = useCallback(() => {
    const id = machineState.draftId;
    if (!id) return;
    discardDraft.mutate(id, {
      onSuccess: () => {
        void deleteDraftDir(`draft-${id}`);
        dispatch({ type: "DISCARD" });
      },
    });
  }, [machineState.draftId, discardDraft]);

  const handlePayloadChange = useCallback(
    (updates: Partial<WizardSchemas.WizardDraftPayload>) => {
      dispatch({ type: "UPDATE_FIELDS", updates });
    },
    [],
  );

  // ── Wizard mode ──
  if (machineState.status !== "idle" && machineState.draftId) {
    const currentStep = ctx.state.currentStep;
    const stepTitle = STEP_TITLES[currentStep] ?? currentStep;

    // Compute upload status counts for chip + publishGate reason
    const uploadStatus = {
      inflight: uploadQueue.photos.filter((p) =>
        ["selected", "compressed", "presigned", "uploading"].includes(p.state),
      ).length,
      failed: uploadQueue.photos.filter((p) => p.state === "failed").length,
      total: uploadQueue.photos.length,
    };

    // Compose a clear reason text when Publish/Continue is disabled.
    let disabledReason: string | undefined;
    if (ctx.isLastStep && !uploadQueue.publishGate.canPublish) {
      if (uploadStatus.failed > 0) {
        disabledReason = `${uploadStatus.failed} failed — retry or remove`;
      } else if (uploadStatus.inflight > 0) {
        disabledReason = `Wait for ${uploadStatus.inflight} photos to finish uploading`;
      } else {
        disabledReason = uploadQueue.publishGate.blockers[0] ?? "Cannot publish yet";
      }
    } else if (ctx.isLastStep && !ctx.canPublish) {
      const missing = WizardSchemas.WIZARD_STEPS.filter(
        (s) =>
          s !== "review" && !machineState.validatedSteps.includes(s),
      );
      if (missing.length > 0) {
        disabledReason = `Complete ${missing.length} step${
          missing.length === 1 ? "" : "s"
        } before publishing.`;
      }
    } else if (
      !ctx.isLastStep &&
      !ctx.canContinue &&
      attemptedSteps[currentStep] &&
      ctx.stepErrors.length > 0
    ) {
      disabledReason = ctx.stepErrors[0];
    }

    const secondaryAction =
      currentStep === "vin" && !ctx.canGoBack
        ? { label: "Skip", onPress: handleSkipVin }
        : undefined;

    return (
      <WizardLayout
        routeTitle={ROUTE_TITLE}
        stepTitle={stepTitle}
        stepNumber={ctx.stepNumber}
        stepCount={ctx.stepCount}
        onBack={handleBack}
        onContinue={handleContinue}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
        mode={machineState.mode}
        editDetourActive={ctx.editDetourActive}
        canContinue={ctx.canContinue}
        canPublish={ctx.canPublish && uploadQueue.publishGate.canPublish}
        canGoBack={ctx.canGoBack}
        isLastStep={ctx.isLastStep}
        saveStatus={saveStatus}
        saveError={saveError}
        onRetrySave={retrySave}
        progressPercent={ctx.progressPercent}
        disabledReason={disabledReason}
        uploadStatus={uploadStatus}
        secondaryAction={secondaryAction}
        isDiscarding={discardDraft.isPending}
        discardError={discardDraft.error?.message ?? null}
      >
        {currentStep === "vin" && (
          <Step1Vin
            payload={machineState.payload}
            onChange={handlePayloadChange}
            fieldErrors={ctx.fieldErrors}
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
            defaultPhone={defaultPhone}
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

  // ── Entry screen ──
  const existingDraft = draftsData?.items?.[0];
  const hasDrafts = !!existingDraft;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-5 pt-3">
        <Text className="text-[32px] font-bold leading-tight tracking-tight text-foreground">
          Sell
        </Text>

        {hasDrafts && isAuthenticated && !draftsLoading ? (
          <View className="mt-6 w-full gap-4">
            <View className="gap-3 rounded-xl border border-border p-4">
              <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Latest draft
              </Text>
              <Text className="text-lg font-semibold text-foreground">
                {existingDraft.payload.brandId && existingDraft.payload.modelId
                  ? `${existingDraft.payload.year ?? ""} ${existingDraft.payload.brandId} ${existingDraft.payload.modelId}`
                  : "Continue your listing"}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {existingDraft.payload.photos?.length
                  ? `${existingDraft.payload.photos.length} photo${existingDraft.payload.photos.length !== 1 ? "s" : ""}`
                  : "No photos yet"}
                {" · "}
                {existingDraft.payload.priceAmount
                  ? `${existingDraft.payload.priceAmount.toLocaleString()} ${existingDraft.payload.priceCurrency ?? "TMT"}`
                  : "Price missing"}
              </Text>
              <Button
                className="h-[52px] rounded-full bg-foreground"
                onPress={() => handleContinueDraft(existingDraft)}
              >
                <Text className="text-background">Continue listing</Text>
              </Button>
            </View>
            <Button
              className="h-[52px] rounded-full border-foreground bg-background"
              variant="outline"
              onPress={handleCreateNewDraft}
            >
              <Text className="text-foreground">New listing</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center px-4">
            <Icon as={PlusCircle} className="size-8 text-muted-foreground" />
            <Text className="mt-4 text-lg font-semibold text-foreground">
              Sell your car
            </Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              List your vehicle on AutoTM
            </Text>
            <Button
              className="mt-6 h-[52px] rounded-full bg-foreground"
              onPress={handleStartListing}
            >
              <Text className="text-background">Start listing</Text>
            </Button>
          </View>
        )}
      </View>

      <SignInDialog
        actionLabel="Continue with phone"
        description="Sign in to list your vehicle on AutoTM."
        open={showSignIn}
        returnPath="/(tabs)/sell"
        title="Sign in to sell"
        onOpenChange={setShowSignIn}
      />
    </SafeAreaView>
  );
}
