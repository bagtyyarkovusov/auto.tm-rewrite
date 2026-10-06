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

interface LeaveEditDialogProps {
  open: boolean;
  /** Dismissing the dialog, by Keep editing or the system back gesture, keeps the seller in the edit. */
  onOpenChange: (open: boolean) => void;
  /** Closes the edit and drops its unsaved changes. */
  onLeave: () => void;
}

/** What leaving a published Listing's edit asks when it has unsaved changes. */
export function LeaveEditDialog({ open, onOpenChange, onLeave }: LeaveEditDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("leaveEditMode")}</AlertDialogTitle>
          <AlertDialogDescription>{t("unsavedChangesLost")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel accessibilityRole="button" onPress={() => onOpenChange(false)}>
            <Text>{t("keepEditing")}</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            accessibilityRole="button"
            className="bg-destructive active:bg-destructive/90"
            onPress={onLeave}
          >
            <Text className="text-destructive-foreground">{t("leave")}</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
