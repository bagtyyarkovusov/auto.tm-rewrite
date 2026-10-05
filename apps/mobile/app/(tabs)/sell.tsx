import { PlusCircle } from "lucide-react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { NavigationContext } from "@react-navigation/native";
import { useContext, useEffect, useReducer, useState, useCallback, useMemo, useRef } from "react";
import { BackHandler, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ListingsSchemas, WizardSchemas } from "@auto-tm/contracts";

import { ApiError } from "../../src/api/client";
import { useCreateDraft } from "../../src/api/listings/useCreateDraft";
import { useDiscardDraft } from "../../src/api/listings/useDiscardDraft";
import { useMyDrafts } from "../../src/api/listings/useMyDrafts";
import { usePublishDraft } from "../../src/api/listings/usePublishDraft";
import { useBrands } from "../../src/api/catalog/useBrands";
import { useModels } from "../../src/api/catalog/useModels";
import { deleteDraftDir } from "../../src/listings/uploadStaging/stagingDir";
import { countUploads } from "../../src/listings/uploadStaging/uploadCounts";
import { useUploadQueue } from "../../src/listings/uploadStaging/useUploadQueue";
import {
  wizardMachineReducer,
  createInitialState,
  buildMachineContext,
  isUntouchedPayload,
} from "../../src/listings/wizard/wizardMachine";
import { LeaveUnsavedDialog } from "../../src/listings/wizard/LeaveUnsavedDialog";
import { WizardLayout } from "../../src/listings/wizard/WizardLayout";
import { useWizardAutosave } from "../../src/listings/wizard/useWizardAutosave";
import { useAuth } from "../../src/auth/useAuth";
import {
  translateWizardError,
  translateWizardFieldErrors,
} from "../../src/listings/wizard/wizardErrors";
import { SignInDialog } from "../../components/auth/SignInDialog";
import { SellEntry } from "../../src/listings/sell/SellEntry";
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

// What is saved and published: only photos that have a key, since the API treats
// a draft photo as attached and Publish needs a keyed one.
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

// What the Photos step validates: every picked photo, key or not, so Continue
// does not wait for an upload. Never saved; see buildPayloadPhotos.
function buildPickedPhotos(
  photos: ReturnType<typeof useUploadQueue>["photos"],
): NonNullable<WizardSchemas.WizardDraftPayload["photos"]> {
  return photos.map((p) => ({
    photoId: p.photoId,
    ...(p.key ? { key: p.key } : {}),
    sortOrder: p.sortOrder,
  }));
}

export default function SellScreen() {
  const { t } = useTranslation();
  // `phone` follows the live auth session, so signing in from this tab's own
  // sign-in sheet fills the Step 7 contact placeholder without a remount.
  const { isAuthenticated, phone: defaultPhone } = useAuth();
  const { show, setTopClearance } = useToast();
  const wizardHeaderHeight = useRef(0);
  const publishErrorToastId = useRef<string | null>(null);
  const handleHeaderHeightChange = useCallback((height: number) => {
    wizardHeaderHeight.current = height;
    if (publishErrorToastId.current) {
      setTopClearance(publishErrorToastId.current, height);
    }
  }, [setTopClearance]);
  const navigation = useContext(NavigationContext);
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ resumeDraftId?: string }>();
  const [showSignIn, setShowSignIn] = useState(false);
  const [draftLimitOpen, setDraftLimitOpen] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);
  // The draft that tapping New listing created in this session. Only that draft is
  // removed when the seller closes it untouched; a draft reopened from the Sell tab
  // or My listings is never deleted by ✕.
  const newDraftIdRef = useRef<string | null>(null);
  const [machineState, dispatch] = useReducer(
    wizardMachineReducer,
    createInitialState(),
  );
  const [attemptedSteps, setAttemptedSteps] = useState<
    Partial<Record<WizardSchemas.WizardStep, boolean>>
  >({});
  const resumedRef = useRef<string | null>(null);
  // Whether the upload queue held the open draft's photos at the last sync.
  const queueWasReady = useRef(false);

  // Hide the bottom tab bar while the wizard is open — the wizard is a focused
  // flow that should not advertise navigation to other tabs.
  const inWizard =
    machineState.status !== "idle" && machineState.draftId !== null;
  useEffect(() => {
    if (!navigation) return;
    navigation.setOptions({
      tabBarStyle: inWizard
        ? { display: "none" as const }
        : undefined,
    });
  }, [inWizard, navigation]);

  // 50 is the API's FeedQuerySchema max — anything higher 400s and breaks
  // draft resume entirely.
  const {
    data: draftsData,
    isPending: draftsLoading,
    error: draftsError,
    refetch: refetchDrafts,
  } = useMyDrafts({
    enabled: !!isAuthenticated,
    limit: params.resumeDraftId ? 50 : 20,
  });

  const createDraft = useCreateDraft();
  const publishDraft = usePublishDraft();
  const discardDraft = useDiscardDraft();

  const { data: brandsData } = useBrands();
  const draftBrandId = draftsData?.items?.[0]?.payload.brandId ?? "";
  const { data: modelsData } = useModels(draftBrandId);
  const draftBrandName = brandsData?.items.find(
    (b) => b.id === draftBrandId,
  )?.name;
  const draftModelName = modelsData?.items.find(
    (m) => m.id === draftsData?.items?.[0]?.payload.modelId,
  )?.name;

  const { save, forceSave, flush, discardPending, retrySave, saveStatus, saveError } =
    useWizardAutosave(machineState.draftId ?? undefined);
  const uploadQueue = useUploadQueue(
    machineState.draftId ? `draft-${machineState.draftId}` : "",
    machineState.payload,
  );

  const ctx = buildMachineContext(machineState);

  // Sync the picked photos into the payload the steps validate. Only which photos
  // there are, and their order, count: a photo's key arriving later changes nothing
  // the Photos step checks, so it must not reset the steps after it. Nor does the
  // first sync of a resumed draft: a photo that was still uploading when the app
  // closed comes back from staging, and that is not a change the seller made.
  // Until the queue holds the open draft's photos it is empty, or holds the last
  // draft's, and says nothing about this one: the saved photos stay as they are.
  const queueReady = uploadQueue.isReady === true && machineState.draftId !== null;
  useEffect(() => {
    const restoring = queueReady && !queueWasReady.current;
    queueWasReady.current = queueReady;
    if (!queueReady) return;
    const picked = buildPickedPhotos(uploadQueue.photos);
    const current = machineState.payload.photos ?? [];
    const sameOrder =
      current.length === picked.length &&
      current.every((photo, index) => photo.photoId === picked[index]?.photoId);
    if (!sameOrder) {
      dispatch({
        type: "UPDATE_FIELDS",
        updates: {
          photos: picked,
        },
        keepValidSteps: restoring,
      });
    }
  }, [uploadQueue.photos, queueReady]);

  // Stable key for autosave trigger — avoids 25+ individual deps and reference churn
  const payloadKey = useMemo(
    () =>
      JSON.stringify({
        ...machineState.payload,
        photos: buildPayloadPhotos(uploadQueue.photos),
        validatedSteps: machineState.validatedSteps,
      }),
    [machineState.payload, machineState.validatedSteps, uploadQueue.photos],
  );

  // Autosave when payload changes. Not before the queue holds this draft's photos:
  // a save built from the queue until then would write the draft without them.
  useEffect(() => {
    if (!queueReady || machineState.status !== "step") return;
    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...machineState.payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: machineState.validatedSteps,
    };
    save(fullPayload);
  }, [machineState.draftId, queueReady, machineState.status, payloadKey, save]);

  const handleStartListing = useCallback(() => {
    if (!isAuthenticated) {
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
    if (!isAuthenticated) {
      setShowSignIn(true);
      return;
    }

    createDraft.mutate(undefined, {
      onSuccess: (draft) => {
        newDraftIdRef.current = draft.id;
        dispatch({
          type: "INIT",
          draftId: draft.id,
          payload: {
            currentStep: 1,
            allowCalls: true,
            allowChat: true,
            priceCurrency: "TMT",
          },
        });
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === ListingsSchemas.ListingsErrorCode.DraftLimitReached) {
          setDraftLimitOpen(true);
          void refetchDrafts();
          return;
        }
        const message =
          err instanceof Error ? err.message : t("failedToCreateDraft");
        show({ title: message, variant: "destructive" });
      },
    });
  }, [isAuthenticated, createDraft, show, refetchDrafts]);

  const handleContinueDraft = useCallback(
    (draft: NonNullable<typeof draftsData>["items"][number]) => {
      dispatch({
        type: "INIT",
        draftId: draft.id,
        payload: {
          ...draft.payload,
          allowCalls: draft.payload.allowCalls ?? true,
          allowChat: draft.payload.allowChat ?? true,
          priceCurrency: draft.payload.priceCurrency ?? "TMT",
        } as WizardSchemas.WizardDraftPayload,
      });
    },
    [],
  );

  // Resume a specific draft when navigated from My Listings / Drafts management.
  useEffect(() => {
    if (!params.resumeDraftId) {
      resumedRef.current = null;
      return;
    }
    if (
      resumedRef.current === params.resumeDraftId ||
      !draftsData ||
      machineState.status !== "idle"
    ) {
      return;
    }
    const target = draftsData.items.find((d) => d.id === params.resumeDraftId);
    if (target) {
      resumedRef.current = params.resumeDraftId;
      handleContinueDraft(target);
    } else {
      resumedRef.current = params.resumeDraftId;
      show({
        title: t("draftNotFound"),
        variant: "destructive",
      });
    }
  }, [params.resumeDraftId, draftsData, machineState.status, handleContinueDraft, show]);

  const handleBack = useCallback(() => {
    dispatch({ type: "BACK" });
    // Force save on navigation, with the step it moves to: the payload in hand
    // still names the step being left.
    const moved = wizardMachineReducer(machineState, { type: "BACK" });
    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...moved.payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: moved.validatedSteps,
    };
    void forceSave(fullPayload);
  }, [machineState, uploadQueue.photos, forceSave]);

  const handleContinue = useCallback(() => {
    if (discardDraft.isPending || publishDraft.isPending) return;
    if (!ctx.canContinue) {
      setAttemptedSteps((current) =>
        current[machineState.currentStep]
          ? current
          : { ...current, [machineState.currentStep]: true },
      );
      return;
    }

    dispatch({ type: "NEXT" });
    // Force save on navigation, with the step it moves to.
    const moved = wizardMachineReducer(machineState, { type: "NEXT" });
    const fullPayload: WizardSchemas.WizardDraftPayload = {
      ...moved.payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
      validatedSteps: moved.validatedSteps,
    };
    void forceSave(fullPayload);
  }, [ctx.canContinue, machineState, uploadQueue.photos, forceSave, discardDraft.isPending, publishDraft.isPending]);

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
        title: t("listingPublished"),
        variant: "success",
      });
      router.replace(`/(public)/listings/${result.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("failedToPublish");
      dispatch({ type: "PUBLISH_ERROR", error: message });
      publishErrorToastId.current = show({
        title: message, variant: "destructive", topClearance: wizardHeaderHeight.current,
      });
    }
  }, [machineState, uploadQueue.photos, forceSave, publishDraft, show]);

  const closeWizard = useCallback(() => {
    newDraftIdRef.current = null;
    setUnsavedDialogOpen(false);
    dispatch({ type: "DISCARD" });
  }, []);

  // ✕: the draft is already on the server, so closing saves the pending change and
  // leaves. A new Listing the seller never touched is deleted instead, so it neither
  // lingers as an empty draft nor counts toward the five-draft limit. A failed save
  // asks before anything is lost. `retry` skips the "last save failed" shortcut so
  // the dialog's Retry really tries again.
  const handleClose = useCallback(
    async (retry = false) => {
      const id = machineState.draftId;
      if (!id || closingRef.current) return;
      if (machineState.status !== "step" && machineState.status !== "publishError") return;

      const payload: WizardSchemas.WizardDraftPayload = {
        ...machineState.payload,
        photos: buildPayloadPhotos(uploadQueue.photos),
        validatedSteps: machineState.validatedSteps,
      };

      closingRef.current = true;
      setIsClosing(true);
      try {
        // A picked photo without a key is not in the payload yet, but it is a change.
        if (
          id === newDraftIdRef.current &&
          uploadQueue.photos.length === 0 &&
          isUntouchedPayload(payload)
        ) {
          discardPending();
          try {
            // Wait, so a New listing tapped right after counts the drafts without this one.
            await discardDraft.mutateAsync(id);
          } catch {
            // Nothing was typed, so nothing is lost; the empty draft stays and can be
            // deleted from My listings.
          }
          void deleteDraftDir(`draft-${id}`);
          closeWizard();
          return;
        }

        if (!retry && saveStatus === "error") {
          setUnsavedDialogOpen(true);
          return;
        }
        if (!(await flush(payload))) {
          setUnsavedDialogOpen(true);
          return;
        }
        closeWizard();
        show({ title: t("savedToDrafts"), variant: "success" });
      } finally {
        closingRef.current = false;
        setIsClosing(false);
      }
    },
    [
      machineState.draftId,
      machineState.status,
      machineState.payload,
      machineState.validatedSteps,
      uploadQueue.photos,
      saveStatus,
      flush,
      discardPending,
      discardDraft,
      closeWizard,
      show,
      t,
    ],
  );

  // Android system back: on the first step it behaves as ✕, on later steps it goes
  // back one step. The create wizard hides the tab bar, so nothing else would handle it.
  // Only while the Sell tab is the focused screen and the wizard can be left: a
  // screen opened over the tabs keeps its own back, and so does a published Listing.
  const backIsWizards =
    isFocused &&
    inWizard &&
    machineState.mode === "create" &&
    (machineState.status === "step" || machineState.status === "publishError");
  useEffect(() => {
    if (!backIsWizards) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isClosing) return true;
      // The dialog is on top: back dismisses it, like Keep editing.
      if (unsavedDialogOpen) {
        setUnsavedDialogOpen(false);
        return true;
      }
      if (ctx.canGoBack) handleBack();
      else void handleClose();
      return true;
    });
    return () => subscription.remove();
  }, [backIsWizards, ctx.canGoBack, isClosing, unsavedDialogOpen, handleBack, handleClose]);

  const handlePayloadChange = useCallback(
    (updates: Partial<WizardSchemas.WizardDraftPayload>) => {
      dispatch({ type: "UPDATE_FIELDS", updates });
    },
    [],
  );

  // ── Wizard mode ──
  if (machineState.status !== "idle" && machineState.draftId) {
    const currentStep = ctx.state.currentStep;
    const fieldErrors = translateWizardFieldErrors(t, ctx.fieldErrors);

    // Compute upload status counts for chip + publishGate reason
    const uploadStatus = countUploads(uploadQueue.photos);

    // Compose a clear reason text when Publish/Continue is disabled.
    let disabledReason: string | undefined;
    if (ctx.isLastStep && !uploadQueue.publishGate.canPublish) {
      if (uploadStatus.failed > 0) {
        disabledReason = t("photosGateFailed", { count: uploadStatus.failed });
      } else if (uploadStatus.inflight > 0) {
        disabledReason = t("photosGateUploading", { count: uploadStatus.inflight });
      } else {
        disabledReason =
          translateWizardError(t, uploadQueue.publishGate.blockers[0]) ??
          t("cannotPublishYet");
      }
    } else if (ctx.isLastStep && !ctx.canPublish) {
      const missing = WizardSchemas.WIZARD_STEPS.filter(
        (s) =>
          s !== "review" && !machineState.validatedSteps.includes(s),
      );
      if (missing.length > 0) {
        disabledReason = t("completeStepsBeforePublish", { count: missing.length });
      }
    } else if (
      !ctx.isLastStep &&
      !ctx.canContinue &&
      attemptedSteps[currentStep] &&
      ctx.stepErrors.length > 0
    ) {
      disabledReason = translateWizardError(t, ctx.stepErrors[0]);
    }

    return (
      <>
      <WizardLayout
        onHeaderHeightChange={handleHeaderHeightChange}
        routeTitle={t("sellCar")}
        stepTitle={t(`wizardSteps.${currentStep}`)}
        stepNumber={ctx.stepNumber}
        stepCount={ctx.stepCount}
        onBack={handleBack}
        onContinue={handleContinue}
        onPublish={handlePublish}
        onClose={() => void handleClose()}
        isClosing={isClosing}
        mode={machineState.mode}
        editDetourActive={ctx.editDetourActive}
        canContinue={
          (ctx.canContinue || currentStep === "specs") &&
          !discardDraft.isPending && !publishDraft.isPending
        }
        canPublish={ctx.canPublish && uploadQueue.publishGate.canPublish}
        canGoBack={ctx.canGoBack}
        isLastStep={ctx.isLastStep}
        saveStatus={saveStatus}
        saveError={saveError}
        onRetrySave={retrySave}
        progressPercent={ctx.progressPercent}
        disabledReason={disabledReason}
        uploadStatus={uploadStatus}
        onUploadStatusPress={() => dispatch({ type: "GO_TO_STEP", step: "photos" })}
      >
        {currentStep === "photos" && (
          <Step2Photos
            photos={uploadQueue.photos}
            onAddPhoto={uploadQueue.addPhoto}
            onRemovePhoto={uploadQueue.removePhoto}
            onReorderPhotos={uploadQueue.reorderPhotos}
            onRetryPhoto={uploadQueue.retryPhoto}
            isCompressing={uploadQueue.isCompressing}
            isUploading={uploadQueue.isUploading}
            fieldErrors={fieldErrors}
          />
        )}
        {currentStep === "vehicle" && (
          <Step3VehicleId
            payload={machineState.payload}
            onChange={handlePayloadChange}
            fieldErrors={fieldErrors}
            showErrors={attemptedSteps.vehicle === true}
          />
        )}
        {currentStep === "specs" && (
          <Step4Specs
            payload={machineState.payload}
            onChange={handlePayloadChange}
            fieldErrors={fieldErrors}
            showErrors={attemptedSteps.specs === true}
          />
        )}
        {currentStep === "price" && (
          <Step5Price
            payload={machineState.payload}
            onChange={handlePayloadChange}
            fieldErrors={fieldErrors}
          />
        )}
        {currentStep === "location" && (
          <Step6Location
            payload={machineState.payload}
            onChange={handlePayloadChange}
            fieldErrors={fieldErrors}
            showErrors={attemptedSteps.location === true}
          />
        )}
        {currentStep === "contact" && (
          <Step7DescContact
            payload={machineState.payload}
            onChange={handlePayloadChange}
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
      <LeaveUnsavedDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onRetry={() => void handleClose(true)}
        onLeave={closeWizard}
      />
      </>
    );
  }

  // ── Entry screen ──
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="px-5 pt-3">
        <Text className="text-3xl font-heading leading-tight tracking-tight text-foreground">
          {t("sell")}
        </Text>
      </View>

      {isAuthenticated ? (
        <SellEntry
          drafts={draftsData?.items}
          isPending={draftsLoading}
          error={draftsError}
          onRetry={() => void refetchDrafts()}
          brandName={draftBrandName}
          modelName={draftModelName}
          isCreating={createDraft.isPending}
          onContinue={handleContinueDraft}
          onCreate={handleCreateNewDraft}
          onNavigate={(href) => router.push(href)}
          limitSheetOpen={draftLimitOpen}
          onLimitSheetOpenChange={setDraftLimitOpen}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-9">
          <Icon as={PlusCircle} className="size-8 text-muted-foreground" />
          <Text className="mt-4 text-lg font-semibold text-foreground">
            {t("sellYourCar")}
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {t("listYourVehicle")}
          </Text>
          <Button
            variant="default"
            size="pill"
            className="mt-6 self-stretch"
            onPress={handleStartListing}
          >
            <Text>{t("startListing")}</Text>
          </Button>
        </View>
      )}

      <SignInDialog
        description={t("signInToSellDescription")}
        open={showSignIn}
        returnTo="/(tabs)/sell"
        title={t("signInToSellTitle")}
        onOpenChange={setShowSignIn}
      />
    </SafeAreaView>
  );
}
