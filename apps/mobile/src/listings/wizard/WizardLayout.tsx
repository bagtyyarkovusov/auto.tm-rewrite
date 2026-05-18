import { ChevronLeft, MoreVertical } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WizardStep } from "./types";

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


interface WizardLayoutProps {
  currentStep: WizardStep;
  stepTitle: string;
  onBack: () => void;
  onContinue: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  canContinue: boolean;
  canPublish: boolean;
  isSaving: boolean;
  children: React.ReactNode;
  publishLabel?: string;
  discardTitle?: string;
  discardDescription?: string;
}

export function WizardLayout({
  currentStep,
  stepTitle,
  onBack,
  onContinue,
  onPublish,
  onDiscard,
  canContinue,
  canPublish,
  isSaving,
  children,
  publishLabel = "Publish",
  discardTitle = "Discard draft?",
  discardDescription = "This will delete your draft and all uploaded photos. This action cannot be undone.",
}: WizardLayoutProps) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === 7;
  const progressValue = (currentStep / 7) * 100;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="w-10">
          {!isFirstStep && (
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
          {stepTitle}
        </Text>

        <View className="w-10">
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

      {/* Progress bar */}
      <View className="px-4 pb-3">
        <Progress value={progressValue} />
        {isSaving && (
          <Text className="mt-1 text-xs text-muted-foreground">Saving...</Text>
        )}
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4">
        {children}
      </ScrollView>

      {/* Footer */}
      <View className="flex-row items-center justify-between border-t border-border px-4 py-3">
        <View className="flex-1">
          {!isFirstStep && (
            <Button variant="outline" onPress={onBack}>
              <Text>Back</Text>
            </Button>
          )}
        </View>

        <View className="flex-1 pl-2">
          {isLastStep ? (
            <Button
              variant="default"
              onPress={onPublish}
              disabled={!canPublish}
            >
              <Text>{publishLabel}</Text>
            </Button>
          ) : (
            <Button
              variant="default"
              onPress={onContinue}
              disabled={!canContinue}
            >
              <Text>Continue</Text>
            </Button>
          )}
        </View>
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
              <Text className="text-destructive-foreground">Discard</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
