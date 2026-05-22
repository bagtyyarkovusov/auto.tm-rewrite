import { ChevronLeft, MoreVertical, AlertCircle, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
import { WizardOverflowMenu } from "@/components/listings/wizard/WizardOverflowMenu";
import { cn } from "@/lib/utils";

interface FooterAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface UploadStatusChip {
  inflight: number;
  failed: number;
  total: number;
}

interface WizardLayoutProps {
  routeTitle: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  onBack: () => void;
  onContinue: () => void;
  onPublish: () => void;
  onReturnToReview?: () => void;
  onDiscard: () => void;
  mode: "create" | "edit";
  editDetourActive: boolean;
  canContinue: boolean;
  canPublish: boolean;
  canGoBack: boolean;
  isLastStep: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  onRetrySave: () => void;
  progressPercent: number;
  children: React.ReactNode;
  disabledReason?: string;
  secondaryAction?: FooterAction;
  publishLabel?: string;
  discardTitle?: string;
  discardDescription?: string;
  isDiscarding?: boolean;
  discardError?: string | null;
  uploadStatus?: UploadStatusChip;
}

function WizardHeader({
  routeTitle,
  stepTitle,
  stepNumber,
  stepCount,
  canGoBack,
  onBack,
  onOpenDiscard,
  progressPercent,
  saveStatus,
  onRetrySave,
}: {
  routeTitle: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  canGoBack: boolean;
  onBack: () => void;
  onOpenDiscard: () => void;
  progressPercent: number;
  saveStatus: WizardLayoutProps["saveStatus"];
  onRetrySave: () => void;
}) {
  const saveStatusText =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "error"
        ? "Could not save"
        : saveStatus === "saved"
          ? "Saved"
          : null;

  const saveStatusClass =
    saveStatus === "error"
      ? "text-destructive"
      : saveStatus === "saved"
        ? "text-success-500"
        : "text-muted-foreground";

  return (
    <View className="border-b border-border px-5 py-3 gap-2">
      {/* Row 1: nav + position marker + inline save status + overflow */}
      <View className="flex-row items-center justify-between">
        <View className="w-10">
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onPress={onBack}
              accessibilityLabel="Go back"
            >
              <Icon as={ChevronLeft} className="size-6 text-foreground" />
            </Button>
          )}
        </View>

        <View className="flex-row items-center gap-1 flex-1 justify-center">
          <Text className="text-xs text-muted-foreground">
            {routeTitle} · Step {stepNumber} of {stepCount}
          </Text>
          {saveStatusText && (
            <Text className={cn("text-xs", saveStatusClass)}>
              {" · "}{saveStatusText}
            </Text>
          )}
          {saveStatus === "error" && (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 py-0"
              onPress={onRetrySave}
            >
              <Text className="text-xs text-destructive">Retry</Text>
            </Button>
          )}
        </View>

        <View className="w-10 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onPress={onOpenDiscard}
            accessibilityLabel="More options"
          >
            <Icon as={MoreVertical} className="size-5 text-foreground" />
          </Button>
        </View>
      </View>

      {/* Row 2: the prominent step title — the ONE title */}
      <Text className="text-2xl font-heading text-foreground">
        {stepTitle}
      </Text>

      {/* Row 3: progress */}
      <Progress
        value={progressPercent}
        className="bg-muted h-1"
        indicatorClassName="bg-foreground"
      />
    </View>
  );
}

function SaveErrorBanner({
  saveStatus,
  saveError,
  onRetrySave,
}: {
  saveStatus: WizardLayoutProps["saveStatus"];
  saveError: string | null;
  onRetrySave: () => void;
}) {
  if (saveStatus !== "error" || !saveError) return null;

  return (
    <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
      <Icon as={AlertCircle} className="size-4 text-destructive" />
      <Text className="flex-1 text-sm text-destructive">{saveError}</Text>
      <Button variant="ghost" size="sm" onPress={onRetrySave}>
        <Icon as={RefreshCw} className="size-4 text-destructive" />
      </Button>
    </View>
  );
}

function WizardFooter({
  isLastStep,
  canContinue,
  canPublish,
  canGoBack,
  onBack,
  onContinue,
  onPublish,
  onReturnToReview,
  mode,
  editDetourActive,
  disabledReason,
  secondaryAction,
  publishLabel = "Publish",
}: {
  isLastStep: boolean;
  canContinue: boolean;
  canPublish: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onContinue: () => void;
  onPublish: () => void;
  onReturnToReview?: () => void;
  mode: "create" | "edit";
  editDetourActive: boolean;
  disabledReason?: string;
  secondaryAction?: FooterAction;
  publishLabel?: string;
}) {
  const primaryDisabled = isLastStep ? !canPublish : !canContinue;
  const showDisabledReason = primaryDisabled && Boolean(disabledReason);
  const isEditReview = mode === "edit" && isLastStep;

  if (editDetourActive) {
    return (
      <View className="border-t border-border px-5 py-3 gap-2">
        {showDisabledReason && (
          <Text className="text-xs text-muted-foreground">
            {disabledReason}
          </Text>
        )}
        <Button
          variant="default"
          size="pill"
          className="flex-1"
          onPress={onReturnToReview}
          disabled={primaryDisabled || !onReturnToReview}
        >
          <Text>Done</Text>
        </Button>
      </View>
    );
  }

  if (isEditReview) {
    return (
      <View className="border-t border-border px-5 py-3 gap-2">
        {showDisabledReason && (
          <Text className="text-xs text-muted-foreground">
            {disabledReason}
          </Text>
        )}
        <Button
          variant="brand"
          size="pill"
          className="flex-1"
          onPress={onPublish}
          disabled={!canPublish}
        >
          <Text>{publishLabel}</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="border-t border-border px-5 py-3 gap-2">
      {showDisabledReason && (
        <Text className="text-xs text-muted-foreground">
          {disabledReason}
        </Text>
      )}
      <View className="flex-row gap-3">
        {canGoBack ? (
          <Button
            variant="outline"
            size="pill"
            className="flex-1"
            onPress={onBack}
          >
            <Text>Back</Text>
          </Button>
        ) : secondaryAction ? (
          <Button
            variant="outline"
            size="pill"
            className="flex-1"
            onPress={secondaryAction.onPress}
            disabled={secondaryAction.disabled}
          >
            <Text>{secondaryAction.label}</Text>
          </Button>
        ) : (
          <View className="flex-1" />
        )}

        {isLastStep ? (
          <Button
            variant="brand"
            size="pill"
            className="flex-1"
            onPress={onPublish}
            disabled={!canPublish}
          >
            <Text>{publishLabel}</Text>
          </Button>
        ) : (
          <Button
            variant="default"
            size="pill"
            className="flex-1"
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text>Continue</Text>
          </Button>
        )}
      </View>

      {canGoBack && secondaryAction && (
        <Button
          variant="link"
          className="self-start"
          onPress={secondaryAction.onPress}
          disabled={secondaryAction.disabled}
        >
          <Text className="text-sm text-foreground underline">
            {secondaryAction.label}
          </Text>
        </Button>
      )}
    </View>
  );
}

function DiscardConfirmationDialog({
  open,
  onOpenChange,
  onDiscard,
  discardTitle,
  discardDescription,
  isDiscarding,
  discardError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  discardTitle: string;
  discardDescription: string;
  isDiscarding?: boolean;
  discardError?: string | null;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{discardTitle}</AlertDialogTitle>
          <AlertDialogDescription>{discardDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        {discardError ? (
          <Text className="text-sm text-destructive">{discardError}</Text>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDiscarding} onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive active:bg-destructive/90"
            disabled={isDiscarding}
            onPress={() => {
              onDiscard();
            }}
          >
            {isDiscarding ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-destructive-foreground">Discarding…</Text>
              </View>
            ) : (
              <Text className="text-destructive-foreground">Discard draft</Text>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function WizardLayout({
  routeTitle,
  stepTitle,
  stepNumber,
  stepCount,
  onBack,
  onContinue,
  onPublish,
  onReturnToReview,
  onDiscard,
  mode,
  editDetourActive,
  canContinue,
  canPublish,
  canGoBack,
  isLastStep,
  saveStatus,
  saveError,
  onRetrySave,
  progressPercent,
  children,
  disabledReason,
  secondaryAction,
  publishLabel = "Publish",
  discardTitle = "Discard draft?",
  discardDescription = "This removes your draft and staged photos for this listing.",
  isDiscarding = false,
  discardError = null,
  uploadStatus,
}: WizardLayoutProps) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <WizardHeader
        routeTitle={routeTitle}
        stepTitle={stepTitle}
        stepNumber={stepNumber}
        stepCount={stepCount}
        canGoBack={canGoBack}
        onBack={onBack}
        onOpenDiscard={() => setShowOverflowMenu(true)}
        progressPercent={progressPercent}
        saveStatus={saveStatus}
        onRetrySave={onRetrySave}
      />

      <SaveErrorBanner
        saveStatus={saveStatus}
        saveError={saveError}
        onRetrySave={onRetrySave}
      />

      <ScrollView className="flex-1 px-5">{children}</ScrollView>

      {uploadStatus && (uploadStatus.inflight > 0 || uploadStatus.failed > 0) && (
        <View className="mx-5 mb-2 flex-row items-center gap-2 rounded-lg bg-muted px-3 py-2">
          {uploadStatus.inflight > 0 && (
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" />
              <Text className="text-xs text-muted-foreground">
                {uploadStatus.inflight} uploading
              </Text>
            </View>
          )}
          {uploadStatus.failed > 0 && (
            <View className="flex-row items-center gap-1.5">
              <Icon as={AlertCircle} className="size-3.5 text-destructive" />
              <Text className="text-xs text-destructive">
                {uploadStatus.failed} failed
              </Text>
            </View>
          )}
        </View>
      )}

      <WizardFooter
        isLastStep={isLastStep}
        canContinue={canContinue}
        canPublish={canPublish}
        canGoBack={canGoBack}
        onBack={onBack}
        onContinue={onContinue}
        onPublish={onPublish}
        onReturnToReview={onReturnToReview}
        mode={mode}
        editDetourActive={editDetourActive}
        disabledReason={disabledReason}
        secondaryAction={secondaryAction}
        publishLabel={publishLabel}
      />

      <WizardOverflowMenu
        open={showOverflowMenu}
        onOpenChange={setShowOverflowMenu}
        onDiscard={() => setShowDiscardDialog(true)}
      >
        <View />
      </WizardOverflowMenu>

      <DiscardConfirmationDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onDiscard={onDiscard}
        discardTitle={discardTitle}
        discardDescription={discardDescription}
        isDiscarding={isDiscarding}
        discardError={discardError}
      />
    </SafeAreaView>
  );
}
