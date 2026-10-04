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
import { Text } from "@/components/ui/text";

interface LeaveUnsavedDialogProps {
  open: boolean;
  /** Dismissing the dialog, by Keep editing or the system back gesture, keeps the seller in the wizard. */
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  /** Closes the wizard and keeps the draft as last saved. */
  onLeave: () => void;
}

/** What ✕ asks when the latest changes did not reach the server. */
export function LeaveUnsavedDialog({ open, onOpenChange, onRetry, onLeave }: LeaveUnsavedDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("latestChangesNotSavedTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("latestChangesNotSavedBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* flex-col keeps Retry first, as read and as shown; the footer's default stacks in reverse. */}
        <AlertDialogFooter className="flex-col">
          <AlertDialogAction accessibilityRole="button" onPress={onRetry}>
            <Text>{t("retry")}</Text>
          </AlertDialogAction>
          <AlertDialogAction
            accessibilityRole="button"
            className="bg-destructive active:bg-destructive/90"
            onPress={onLeave}
          >
            <Text className="text-destructive-foreground">{t("leaveAnyway")}</Text>
          </AlertDialogAction>
          <AlertDialogCancel accessibilityRole="button" onPress={() => onOpenChange(false)}>
            <Text>{t("keepEditing")}</Text>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
