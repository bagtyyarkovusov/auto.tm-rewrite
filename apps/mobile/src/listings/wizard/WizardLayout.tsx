import { ChevronLeft, AlertCircle, RefreshCw, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

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
  onHeaderHeightChange?: (height: number) => void;
  routeTitle: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  onBack: () => void;
  onContinue: () => void;
  onPublish: () => void;
  onReturnToReview?: () => void;
  /** Create flow: ✕ saves the draft and closes. The screen owns the save and the unsaved dialog. */
  onClose?: () => void;
  /** ✕ is disabled while a close is in progress. */
  isClosing?: boolean;
  /** Edit flow: Cancel opens "Leave edit mode?" and this runs when the seller confirms. */
  onDiscard?: () => void;
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
  /** Create flow, last step: what keeps Publish disabled, listed above it in this order. */
  publishBlockers?: string[];
  /** Create flow: Publish reads "Publishing..." and takes no taps. */
  isPublishing?: boolean;
  secondaryAction?: FooterAction;
  publishLabel?: string;
  discardTitle?: string;
  discardDescription?: string;
  isDiscarding?: boolean;
  discardError?: string | null;
  uploadStatus?: UploadStatusChip;
  /** Tapping the header's upload chip: open Photos. Without it the chip is plain status. */
  onUploadStatusPress?: () => void;
}

/** "Saved", "Saving..." or "Not saved. Retry", read politely by a screen reader. */
function SaveStatusLine({
  saveStatus,
  onRetrySave,
}: {
  saveStatus: WizardLayoutProps["saveStatus"];
  onRetrySave: () => void;
}) {
  const { t } = useTranslation();
  const text =
    saveStatus === "saving"
      ? t("savingEllipsis")
      : saveStatus === "saved"
        ? t("saved")
        : saveStatus === "error"
          ? t("notSavedRetry")
          : null;

  // `accessibilityLiveRegion` covers Android; iOS has no live regions, so it is announced.
  useEffect(() => {
    if (text && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(text);
  }, [text]);

  return (
    <View accessibilityLiveRegion="polite" className="min-h-4">
      {saveStatus === "error" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text ?? undefined}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          className="self-start"
          onPress={onRetrySave}
        >
          <Text className="text-xs text-destructive">{text}</Text>
        </Pressable>
      ) : text ? (
        <Text
          className={cn(
            "text-xs",
            saveStatus === "saved" ? "text-success-500" : "text-muted-foreground",
          )}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

function WizardHeader({
  onHeaderHeightChange,
  routeTitle,
  stepTitle,
  stepNumber,
  stepCount,
  canGoBack,
  onBack,
  mode,
  onClose,
  isClosing,
  onOpenDiscard,
  progressPercent,
  saveStatus,
  onRetrySave,
  uploadStatus,
  onUploadStatusPress,
}: {
  onHeaderHeightChange?: (height: number) => void;
  routeTitle: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  canGoBack: boolean;
  onBack: () => void;
  mode: WizardLayoutProps["mode"];
  onClose?: (() => void) | undefined;
  isClosing: boolean;
  onOpenDiscard: () => void;
  progressPercent: number;
  saveStatus: WizardLayoutProps["saveStatus"];
  onRetrySave: () => void;
  uploadStatus?: UploadStatusChip;
  onUploadStatusPress?: () => void;
}) {
  const { t } = useTranslation();
  const stepPosition = t("stepOf", { step: stepNumber, total: stepCount });
  // A screen reader hears the step title with its position each time a step opens.
  const stepAnnouncement = `${stepTitle}, ${stepPosition}`;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(stepAnnouncement);
  }, [stepAnnouncement]);

  return (
    <View
      onLayout={(event) => onHeaderHeightChange?.(event.nativeEvent.layout.height)}
      className="border-b border-border px-5 py-3 gap-2">
      {/* Row 1: nav + position marker + close */}
      <View className="flex-row items-center justify-between">
        {canGoBack ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-0 -ml-1"
            onPress={onBack}
            accessibilityLabel={t("back")}
          >
            <View className="flex-row items-center gap-0.5">
              <Icon as={ChevronLeft} className="size-5 text-foreground" />
              <Text className="text-sm font-medium text-foreground">{t("back")}</Text>
            </View>
          </Button>
        ) : (
          <View className="w-16" />
        )}

        <View className="flex-row items-center gap-1 flex-1 justify-center">
          {/* The heading below already reads the position, so this row reads only the route. */}
          <Text className="text-xs text-muted-foreground" accessibilityLabel={routeTitle}>
            {routeTitle} · {stepPosition}
          </Text>
        </View>

        {mode === "create" ? (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-3"
            onPress={onClose}
            disabled={isClosing}
            accessibilityLabel={t("close")}
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-0 -mr-1"
            onPress={onOpenDiscard}
            accessibilityLabel={t("discard")}
          >
            <Text className="text-sm font-medium text-muted-foreground">{t("cancel")}</Text>
          </Button>
        )}
      </View>

      {/* Row 2: the prominent step title — the ONE title */}
      <Text
        className="text-2xl font-heading text-foreground"
        accessibilityRole="header"
        accessibilityLabel={stepAnnouncement}
      >
        {stepTitle}
      </Text>

      {/* Row 3: progress */}
      <Progress
        value={progressPercent}
        className="bg-muted h-1"
        indicatorClassName="bg-foreground"
      />

      {/* Row 4: where the draft stands; the line's height is kept so nothing jumps */}
      <SaveStatusLine saveStatus={saveStatus} onRetrySave={onRetrySave} />

      <UploadStatusChipRow
        uploadStatus={uploadStatus}
        onPress={onUploadStatusPress}
      />
    </View>
  );
}

/** Photos still uploading and photos that failed, kept in view on every step. */
function UploadStatusChipRow({
  uploadStatus,
  onPress,
}: {
  uploadStatus?: UploadStatusChip;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  if (!uploadStatus || (uploadStatus.inflight === 0 && uploadStatus.failed === 0)) {
    return null;
  }
  const uploadingText = t("uploadChipUploading", { count: uploadStatus.inflight });
  const failedText = t("uploadChipFailed", { count: uploadStatus.failed });
  const chip = (
    <View className="flex-row items-center gap-3 self-start rounded-full bg-muted px-3 py-1.5">
      {uploadStatus.inflight > 0 && (
        <View className="flex-row items-center gap-1.5">
          <ActivityIndicator size="small" />
          <Text className="text-xs text-muted-foreground">{uploadingText}</Text>
        </View>
      )}
      {uploadStatus.failed > 0 && (
        <View className="flex-row items-center gap-1.5">
          <Icon as={AlertCircle} className="size-3.5 text-destructive" />
          <Text className="text-xs text-destructive">{failedText}</Text>
        </View>
      )}
    </View>
  );
  if (!onPress) return chip;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        uploadStatus.inflight > 0 ? uploadingText : null,
        uploadStatus.failed > 0 ? failedText : null,
      ]
        .filter(Boolean)
        .join(", ")}
      className="min-h-11 justify-center self-start active:opacity-70"
      onPress={onPress}
    >
      {chip}
    </Pressable>
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
  publishBlockers,
  isPublishing = false,
  secondaryAction,
  publishLabel,
}: {
  publishBlockers?: string[];
  isPublishing?: boolean;
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
  const { t } = useTranslation();
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
          className="w-full"
          onPress={onReturnToReview}
          disabled={primaryDisabled || !onReturnToReview}
        >
          <Text>{t("done")}</Text>
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
          className="w-full"
          onPress={onPublish}
          disabled={!canPublish}
        >
          <Text>{publishLabel ?? t("publish")}</Text>
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
      {isLastStep && publishBlockers && publishBlockers.length > 0 ? (
        // One line each, so a screen reader reads them in this order before Publish.
        <View testID="publish-blockers" className="gap-0.5">
          {publishBlockers.map((line) => (
            <Text key={line} className="text-xs text-destructive">
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <View className="flex-row gap-3">
        {canGoBack ? (
          <Button
            variant="outline"
            size="pill"
            className="flex-1"
            onPress={onBack}
          >
            <Text>{t("back")}</Text>
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
            // Disabled while publishing, so a second tap cannot publish twice.
            disabled={!canPublish || isPublishing}
            accessibilityState={{ busy: isPublishing }}
          >
            <Text>{isPublishing ? t("publishingEllipsis") : (publishLabel ?? t("publish"))}</Text>
          </Button>
        ) : (
          <Button
            variant="default"
            size="pill"
            className="flex-1"
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text>{t("continue")}</Text>
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
  const { t } = useTranslation();
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
            <Text>{t("keepEditing")}</Text>
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
                <Text className="text-destructive-foreground">{t("discarding")}</Text>
              </View>
            ) : (
              <Text className="text-destructive-foreground">{t("discard")}</Text>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function WizardLayout({
  onHeaderHeightChange,
  routeTitle,
  stepTitle,
  stepNumber,
  stepCount,
  onBack,
  onContinue,
  onPublish,
  onReturnToReview,
  onClose,
  isClosing = false,
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
  publishBlockers,
  isPublishing,
  secondaryAction,
  publishLabel,
  discardTitle,
  discardDescription,
  isDiscarding = false,
  discardError = null,
  uploadStatus,
  onUploadStatusPress,
}: WizardLayoutProps) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <WizardHeader
        onHeaderHeightChange={onHeaderHeightChange}
        routeTitle={routeTitle}
        stepTitle={stepTitle}
        stepNumber={stepNumber}
        stepCount={stepCount}
        canGoBack={canGoBack}
        onBack={onBack}
        mode={mode}
        onClose={onClose}
        isClosing={isClosing}
        onOpenDiscard={() => setShowDiscardDialog(true)}
        progressPercent={progressPercent}
        saveStatus={saveStatus}
        onRetrySave={onRetrySave}
        uploadStatus={uploadStatus}
        onUploadStatusPress={onUploadStatusPress}
      />

      <SaveErrorBanner
        saveStatus={saveStatus}
        saveError={saveError}
        onRetrySave={onRetrySave}
      />

      {/* Content area: flex-1 so footer sticks to bottom when content is short,
          ScrollView without flex-1 so it shrinks to content height with no gap */}
      <View className="flex-1">
        <ScrollView>
          <View className="w-full px-5">{children}</View>
        </ScrollView>

        <View className="mt-auto">
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
            publishBlockers={publishBlockers}
            isPublishing={isPublishing}
            secondaryAction={secondaryAction}
            publishLabel={publishLabel}
          />
        </View>
      </View>

      {/* Only the edit flow confirms before leaving; the create wizard has ✕ and no discard. */}
      {mode === "edit" && onDiscard && discardTitle && discardDescription ? (
        <DiscardConfirmationDialog
          open={showDiscardDialog}
          onOpenChange={setShowDiscardDialog}
          onDiscard={onDiscard}
          discardTitle={discardTitle}
          discardDescription={discardDescription}
          isDiscarding={isDiscarding}
          discardError={discardError}
        />
      ) : null}
    </SafeAreaView>
  );
}
