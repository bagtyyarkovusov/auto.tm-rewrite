import { PlusCircle } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCreateDraft } from "../../src/api/listings/useCreateDraft";
import { useDiscardDraft } from "../../src/api/listings/useDiscardDraft";
import { useMyDrafts } from "../../src/api/listings/useMyDrafts";
import { usePublishDraft } from "../../src/api/listings/usePublishDraft";
import { deleteDraftDir } from "../../src/listings/uploadStaging/stagingDir";
import { useUploadQueue } from "../../src/listings/uploadStaging/useUploadQueue";
import type { WizardPayload, WizardStep } from "../../src/listings/wizard/types";
import { WizardLayout } from "../../src/listings/wizard/WizardLayout";
import { useWizardAutosave } from "../../src/listings/wizard/useWizardAutosave";
import { useAuth } from "../../src/auth/useAuth";
import { SignInDialog } from "../../components/auth/SignInDialog";
import Step1Vin from "../../src/listings/wizard/Step1Vin";
import Step2Photos from "../../src/listings/wizard/Step2Photos";
import Step3VehicleId from "../../src/listings/wizard/Step3VehicleId";
import Step4Specs from "../../src/listings/wizard/Step4Specs";
import Step5Price from "../../src/listings/wizard/Step5Price";
import Step6Location from "../../src/listings/wizard/Step6Location";
import Step7DescContact from "../../src/listings/wizard/Step7DescContact";

import { useToast } from "@/components/ui/toast";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const STEP_TITLES: Record<WizardStep, string> = {
  1: "Photos",
  2: "Brand & Model",
  3: "Details",
  4: "Condition",
  5: "Price",
  6: "Location",
  7: "Contact",
};

function getStepTitle(step: WizardStep): string {
  return STEP_TITLES[step] ?? `Step ${step}`;
}

function buildPayloadPhotos(
  photos: ReturnType<typeof useUploadQueue>["photos"],
): NonNullable<WizardPayload["photos"]> {
  return photos
    .filter((p): p is typeof p & { key: string } => !!p.key)
    .map((p) => ({
      photoId: p.photoId,
      key: p.key,
      sortOrder: p.sortOrder,
    }));
}

function getCanContinue(
  step: WizardStep,
  payload: WizardPayload,
  photosCount: number,
): boolean {
  switch (step) {
    case 1:
      return true;
    case 2:
      return photosCount >= 1;
    case 3:
      return !!payload.brandId && !!payload.modelId && !!payload.year;
    case 4:
      return payload.condition === "new" || !!payload.mileageKm;
    case 5:
      return !!payload.priceAmount && !!payload.priceCurrency;
    case 6:
      return !!payload.regionId && !!payload.cityId;
    case 7:
      return (
        !!payload.description &&
        ((payload.allowCalls ?? true) || (payload.allowChat ?? true))
      );
  }
}

export default function SellScreen() {
  const { isAuthenticated } = useAuth();
  const { show } = useToast();
  const [showSignIn, setShowSignIn] = useState(false);
  const [wizardMode, setWizardMode] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [payload, setPayload] = useState<WizardPayload>({ currentStep: 1 });

  const { data: draftsData, isPending: draftsLoading } = useMyDrafts();
  const createDraft = useCreateDraft();
  const publishDraft = usePublishDraft();
  const discardDraft = useDiscardDraft();

  const { save, forceSave, isSaving } = useWizardAutosave(draftId ?? "");
  const uploadQueue = useUploadQueue(draftId ?? "", payload);

  function handlePayloadChange(updates: Partial<WizardPayload>) {
    setPayload((prev) => ({ ...prev, ...updates }));
  }

  // Sync upload queue photos into payload
  useEffect(() => {
    const photosFromQueue = buildPayloadPhotos(uploadQueue.photos);
    setPayload((prev) => {
      const prevPhotos = prev.photos ?? [];
      if (
        prevPhotos.length === photosFromQueue.length &&
        prevPhotos.every(
          (p, i) =>
            p.photoId === photosFromQueue[i]?.photoId &&
            p.key === photosFromQueue[i]?.key &&
            p.sortOrder === photosFromQueue[i]?.sortOrder,
        )
      ) {
        return prev;
      }
      return { ...prev, photos: photosFromQueue };
    });
  }, [uploadQueue.photos]);

  // Debounced autosave when payload changes (excluding photos which are handled above)
  useEffect(() => {
    if (!draftId || !wizardMode) return;
    const fullPayload: WizardPayload = {
      ...payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
    };
    save(fullPayload);
    // Intentionally omit `save` and `uploadQueue.photos` to avoid infinite loops;
    // field changes drive debounced saves.
  }, [
    draftId,
    wizardMode,
    payload.vin,
    payload.brandId,
    payload.modelId,
    payload.generationId,
    payload.year,
    payload.mileageKm,
    payload.condition,
    payload.colorId,
    payload.bodyTypeId,
    payload.transmissionId,
    payload.driveTypeId,
    payload.engineTypeId,
    payload.enginePower,
    payload.priceAmount,
    payload.priceCurrency,
    payload.regionId,
    payload.cityId,
    payload.locationText,
    payload.description,
    payload.contactPhone,
    payload.allowCalls,
    payload.allowChat,
    payload.acceptsExchange,
    payload.installmentAvailable,
    payload.currentStep,
  ]);

  function handleStartListing() {
    if (!isAuthenticated) {
      setShowSignIn(true);
      return;
    }

    const existingDraft = draftsData?.items?.[0];
    if (existingDraft) {
      // Show resume screen — handled by the render below
      return;
    }

    handleCreateNewDraft();
  }

  function handleCreateNewDraft() {
    if (!isAuthenticated) {
      setShowSignIn(true);
      return;
    }

    createDraft.mutate(undefined, {
      onSuccess: (draft) => {
        setDraftId(draft.id);
        setCurrentStep(1);
        setPayload({ currentStep: 1 });
        setWizardMode(true);
      },
    });
  }

  function handleContinueDraft(
    draft: NonNullable<typeof draftsData>["items"][number],
  ) {
    setDraftId(draft.id);
    const step = Math.min(
      Math.max(1, draft.payload.currentStep ?? 1),
      7,
    ) as WizardStep;
    setCurrentStep(step);
    setPayload({ ...draft.payload, currentStep: step });
    setWizardMode(true);
  }

  function handleBack() {
    if (currentStep > 1) {
      const next = (currentStep - 1) as WizardStep;
      setCurrentStep(next);
      const fullPayload: WizardPayload = {
        ...payload,
        currentStep: next,
        photos: buildPayloadPhotos(uploadQueue.photos),
      };
      setPayload(fullPayload);
      void forceSave(fullPayload);
    }
  }

  function handleContinue() {
    if (currentStep < 7) {
      const next = (currentStep + 1) as WizardStep;
      setCurrentStep(next);
      const fullPayload: WizardPayload = {
        ...payload,
        currentStep: next,
        photos: buildPayloadPhotos(uploadQueue.photos),
      };
      setPayload(fullPayload);
      void forceSave(fullPayload);
    }
  }

  function handlePublish() {
    if (!draftId) return;
    const fullPayload: WizardPayload = {
      ...payload,
      photos: buildPayloadPhotos(uploadQueue.photos),
    };
    void forceSave(fullPayload).then(() => {
      publishDraft.mutate(draftId, {
        onSuccess: (result) => {
          show({
            title: "Listing published",
            variant: "success",
          });
          setWizardMode(false);
          setDraftId(null);
          setPayload({ currentStep: 1 });
          // Route will be available in S5; cast to avoid TS error during S4
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.push(`/(public)/listings/${result.id}` as any);
        },
      });
    });
  }

  function handleDiscard() {
    if (!draftId) return;
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        void deleteDraftDir(draftId);
        setWizardMode(false);
        setDraftId(null);
        setPayload({ currentStep: 1 });
      },
    });
  }

  // ── Wizard mode ──
  if (wizardMode && draftId) {
    return (
      <WizardLayout
        currentStep={currentStep}
        stepTitle={getStepTitle(currentStep)}
        onBack={handleBack}
        onContinue={handleContinue}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
        canContinue={getCanContinue(
          currentStep,
          payload,
          uploadQueue.photos.length,
        )}
        canPublish={uploadQueue.publishGate.canPublish}
        isSaving={isSaving}
      >
        {currentStep === 1 && (
          <Step1Vin payload={payload} onChange={handlePayloadChange} />
        )}
        {currentStep === 2 && (
          <Step2Photos
            payload={payload}
            onChange={handlePayloadChange}
            photos={uploadQueue.photos}
            onAddPhoto={uploadQueue.addPhoto}
            onRemovePhoto={uploadQueue.removePhoto}
            onReorderPhotos={uploadQueue.reorderPhotos}
            onRetryPhoto={uploadQueue.retryPhoto}
            isCompressing={uploadQueue.isCompressing}
            isUploading={uploadQueue.isUploading}
          />
        )}
        {currentStep === 3 && (
          <Step3VehicleId payload={payload} onChange={handlePayloadChange} />
        )}
        {currentStep === 4 && (
          <Step4Specs payload={payload} onChange={handlePayloadChange} />
        )}
        {currentStep === 5 && (
          <Step5Price payload={payload} onChange={handlePayloadChange} />
        )}
        {currentStep === 6 && (
          <Step6Location payload={payload} onChange={handlePayloadChange} />
        )}
        {currentStep === 7 && (
          <Step7DescContact payload={payload} onChange={handlePayloadChange} />
        )}
      </WizardLayout>
    );
  }

  // ── Entry screen ──
  const existingDraft = draftsData?.items?.[0];
  const hasDrafts = !!existingDraft;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-4">
        <Icon as={PlusCircle} className="size-8 text-muted-foreground" />
        <Text className="mt-4 text-lg font-semibold text-foreground">
          Sell your car
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          List your vehicle on AutoTM
        </Text>

        {hasDrafts && isAuthenticated && !draftsLoading ? (
          <View className="mt-6 w-full gap-3">
            <Button
              size="lg"
              variant="default"
              onPress={() => handleContinueDraft(existingDraft)}
            >
              <Text>Continue listing</Text>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onPress={handleCreateNewDraft}
            >
              <Text>New listing</Text>
            </Button>
          </View>
        ) : (
          <Button
            className="mt-6"
            size="lg"
            variant="default"
            onPress={handleStartListing}
          >
            <Text>Start listing</Text>
          </Button>
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
