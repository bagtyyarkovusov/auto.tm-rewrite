import { ChevronLeft, MoreVertical, AlertCircle, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
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
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { WizardOverflowMenu } from "@/components/listings/wizard/WizardOverflowMenu";

interface FooterAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface WizardLayoutProps {
  routeTitle: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  onBack: () => void;
  onContinue: () => void;
  onPublish: () => void;
  onDiscard: () => void;
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
}: {
  routeTitle: string;
  stepTitle: string;
  stepNumber: number;
  stepCount: number;
  canGoBack: boolean;
  onBack: () => void;
  onOpenDiscard: () => void;
  progressPercent: number;
}) {
  return (
    <View className="border-b border-gray-100 px-5 pt-2 pb-3 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="w-10">
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onPress={onBack}
              accessibilityLabel="Go back"
            >
              <Icon as={ChevronLeft} className="size-5 text-foreground" />
            </Button>
          )}
        </View>

        <Text className="text-[15px] font-semibold text-foreground">
          {routeTitle}
        </Text>

        <View className="w-10 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onPress={onOpenDiscard}
            accessibilityLabel="More options"
          >
            <Icon as={MoreVertical} className="size-5 text-foreground" />
          </Button>
        </View>
      </View>

      <View className="gap-1">
        <Text className="font-uber text-[22px] font-bold leading-tight tracking-tight text-foreground">
          {stepTitle}
        </Text>
        <Text className="text-sm text-gray-500">
          Step {stepNumber} of {stepCount}
        </Text>
      </View>

      <View className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <View
          className="h-full rounded-full bg-foreground"
          style={{ width: `${progressPercent}%` }}
        />
      </View>
    </View>
  );
}

function SaveStatusIndicator({
  saveStatus,
  onRetrySave,
}: {
  saveStatus: WizardLayoutProps["saveStatus"];
  onRetrySave: () => void;
}) {
  const saveStatusText =
    saveStatus === "saving"
      ? "Saving draft..."
      : saveStatus === "error"
        ? "Could not save"
        : saveStatus === "saved"
          ? "Saved"
          : null;

  if (!saveStatusText) return null;

  return (
    <View className="flex-row items-center gap-2">
      <Text
        className={cn(
          "text-xs",
          saveStatus === "error" && "text-error",
          saveStatus === "saved" && "text-gray-500",
          saveStatus === "saving" && "text-gray-400",
        )}
      >
        {saveStatusText}
      </Text>
      {saveStatus === "error" && (
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 py-0"
          onPress={onRetrySave}
        >
          <Text className="text-xs font-medium text-error">Retry</Text>
        </Button>
      )}
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
    <View className="mx-5 mt-2 flex-row items-center gap-2 rounded-lg bg-error-bg px-3 py-2.5">
      <Icon as={AlertCircle} className="size-4 text-error" />
      <Text className="flex-1 text-sm text-error">{saveError}</Text>
      <Button variant="ghost" size="sm" onPress={onRetrySave}>
        <Icon as={RefreshCw} className="size-4 text-error" />
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
  disabledReason?: string;
  secondaryAction?: FooterAction;
  publishLabel?: string;
}) {
  const primaryDisabled = isLastStep ? !canPublish : !canContinue;
  const showDisabledReason = primaryDisabled && Boolean(disabledReason);

  return (
    <View className="border-t border-gray-100 px-5 py-4 gap-2">
      {showDisabledReason && (
        <Text className="text-xs text-gray-500">{disabledReason}</Text>
      )}
      <View className="flex-row gap-3">
        {canGoBack ? (
          <Button
            variant="outline"
            className="h-[52px] flex-1 rounded-full border-gray-200"
            onPress={onBack}
          >
            <Text className="text-base font-medium text-foreground">Back</Text>
          </Button>
        ) : secondaryAction ? (
          <Button
            variant="outline"
            className="h-[52px] flex-1 rounded-full border-gray-200"
            onPress={secondaryAction.onPress}
            disabled={secondaryAction.disabled}
          >
            <Text className="text-base font-medium text-foreground">{secondaryAction.label}</Text>
          </Button>
        ) : (
          <View className="flex-1" />
        )}

        {isLastStep ? (
          <Button
            className={cn(
              "h-[52px] flex-1 rounded-full",
              primaryDisabled
                ? "border border-gray-200 bg-gray-100"
                : "bg-foreground",
            )}
            onPress={onPublish}
            disabled={!canPublish}
          >
            <Text
              className={cn(
                "text-base font-medium",
                primaryDisabled ? "text-gray-400" : "text-background",
              )}
            >
              {publishLabel}
            </Text>
          </Button>
        ) : (
          <Button
            className={cn(
              "h-[52px] flex-1 rounded-full",
              primaryDisabled
                ? "border border-gray-200 bg-gray-100"
                : "bg-foreground",
            )}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text
              className={cn(
                "text-base font-medium",
                primaryDisabled ? "text-gray-400" : "text-background",
              )}
            >
              Continue
            </Text>
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
          <Text className="text-sm font-medium text-foreground underline">
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  discardTitle: string;
  discardDescription: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{discardTitle}</AlertDialogTitle>
          <AlertDialogDescription>{discardDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onPress={() => onOpenChange(false)}>
            <Text>Cancel</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              onOpenChange(false);
              onDiscard();
            }}
          >
            <Text className="text-destructive-foreground">Discard draft</Text>
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
  onDiscard,
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
}: WizardLayoutProps) {
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

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
      />

      <WizardOverflowMenu
        open={showOverflowMenu}
        onOpenChange={setShowOverflowMenu}
        onDiscard={() => setShowDiscardDialog(true)}
      />

      <View className="flex-row items-center justify-between px-5 py-1">
        <SaveStatusIndicator
          saveStatus={saveStatus}
          onRetrySave={onRetrySave}
        />
      </View>

      <SaveErrorBanner
        saveStatus={saveStatus}
        saveError={saveError}
        onRetrySave={onRetrySave}
      />

      <ScrollView className="flex-1 px-5">{children}</ScrollView>

      <WizardFooter
        isLastStep={isLastStep}
        canContinue={canContinue}
        canPublish={canPublish}
        canGoBack={canGoBack}
        onBack={onBack}
        onContinue={onContinue}
        onPublish={onPublish}
        disabledReason={disabledReason}
        secondaryAction={secondaryAction}
        publishLabel={publishLabel}
      />

      <DiscardConfirmationDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        onDiscard={onDiscard}
        discardTitle={discardTitle}
        discardDescription={discardDescription}
      />
    </SafeAreaView>
  );
}
