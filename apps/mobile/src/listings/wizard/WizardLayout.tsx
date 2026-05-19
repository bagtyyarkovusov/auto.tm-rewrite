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
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";

interface FooterAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface WizardLayoutProps {
  /** Constant route title shown above the step title — "Sell car" or "Edit listing". */
  routeTitle: string;
  /** Step-specific bold title shown beneath the route title. */
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
  /** Optional helper text rendered beneath a disabled Continue/Publish button. */
  disabledReason?: string;
  /** Optional secondary footer action injected by individual steps (e.g. VIN Skip). */
  secondaryAction?: FooterAction;
  publishLabel?: string;
  discardTitle?: string;
  discardDescription?: string;
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
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const saveStatusText =
    saveStatus === "saving"
      ? "Saving draft"
      : saveStatus === "error"
        ? "Could not save"
        : saveStatus === "saved"
          ? "Saved"
          : null;

  const primaryDisabled = isLastStep ? !canPublish : !canContinue;
  const showDisabledReason = primaryDisabled && Boolean(disabledReason);
  const primaryButtonDisabledClass = primaryDisabled
    ? "border border-border bg-muted opacity-100 shadow-none"
    : undefined;
  const primaryButtonTextClass = primaryDisabled
    ? "text-muted-foreground"
    : undefined;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="border-b border-border px-4 py-3 gap-2">
        <View className="flex-row items-center justify-between">
          <View className="w-10">
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onPress={onBack}
                accessibilityLabel="Go back"
              >
                <Icon as={ChevronLeft} className="size-6 text-foreground" />
              </Button>
            )}
          </View>

          <Text className="text-base font-semibold text-foreground">
            {routeTitle}
          </Text>

          <View className="w-10 items-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onPress={() => setShowDiscardDialog(true)}
              accessibilityLabel="More options"
            >
              <Icon as={MoreVertical} className="size-5 text-foreground" />
            </Button>
          </View>
        </View>

        <Text className="text-lg font-semibold text-foreground">
          {stepTitle}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">
            Step {stepNumber} of {stepCount}
          </Text>
          {saveStatusText && (
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-sm ${
                  saveStatus === "error"
                    ? "text-destructive"
                    : saveStatus === "saved"
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
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
                  <Text className="text-sm text-destructive">Retry</Text>
                </Button>
              )}
            </View>
          )}
        </View>

        <Progress
          value={progressPercent}
          className="bg-muted"
          indicatorClassName="bg-primary"
        />
      </View>

      {/* Save error banner (only shown when retry didn't immediately succeed) */}
      {saveStatus === "error" && saveError && (
        <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <Icon as={AlertCircle} className="size-4 text-destructive" />
          <Text className="flex-1 text-sm text-destructive">{saveError}</Text>
          <Button variant="ghost" size="sm" onPress={onRetrySave}>
            <Icon as={RefreshCw} className="size-4 text-destructive" />
          </Button>
        </View>
      )}

      {/* Content */}
      <ScrollView className="flex-1 px-4">{children}</ScrollView>

      {/* Footer */}
      <View className="border-t border-border px-4 py-3 gap-2">
        {showDisabledReason && (
          <Text className="text-xs text-muted-foreground">
            {disabledReason}
          </Text>
        )}
        <View className="flex-row gap-3">
          {canGoBack ? (
            <Button variant="outline" className="flex-1" onPress={onBack}>
              <Text>Back</Text>
            </Button>
          ) : secondaryAction ? (
            <Button
              variant="outline"
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
              variant="default"
              className={`flex-1 ${primaryButtonDisabledClass ?? ""}`}
              onPress={onPublish}
              disabled={!canPublish}
            >
              <Text className={primaryButtonTextClass}>{publishLabel}</Text>
            </Button>
          ) : (
            <Button
              variant="default"
              className={`flex-1 ${primaryButtonDisabledClass ?? ""}`}
              onPress={onContinue}
              disabled={!canContinue}
            >
              <Text className={primaryButtonTextClass}>Continue</Text>
            </Button>
          )}
        </View>

        {/* Secondary action shown beneath when Back is the primary outline slot. */}
        {canGoBack && secondaryAction && (
          <Button
            variant="link"
            className="self-start"
            onPress={secondaryAction.onPress}
            disabled={secondaryAction.disabled}
          >
            <Text className="text-sm text-primary">{secondaryAction.label}</Text>
          </Button>
        )}
      </View>

      {/* Discard confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>{discardDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowDiscardDialog(false)}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                setShowDiscardDialog(false);
                onDiscard();
              }}
            >
              <Text className="text-destructive-foreground">Discard draft</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
