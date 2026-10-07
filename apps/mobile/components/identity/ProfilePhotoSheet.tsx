import { Camera, Image, Trash2 } from "lucide-react-native";
import { useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { MenuDivider, MenuGroup, MenuRow } from "@/components/account/MenuRow";
import { BackButton } from "@/components/navigation/StackHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ProfilePhotoSheetProps {
  open: boolean;
  hasPhoto: boolean;
  onOpenChange(open: boolean): void;
  onTakePhoto(): void;
  onChoosePhoto(): void;
  onRemovePhoto(): void;
}

/** The system picker owns cropping; this sheet only chooses the action. */
export function ProfilePhotoSheet({ open, hasPhoto, onOpenChange, onTakePhoto, onChoosePhoto, onRemovePhoto }: ProfilePhotoSheetProps) {
  const { t } = useTranslation("account");
  const { height, fontScale } = useWindowDimensions();
  const sheetHeight = Math.min(height * 0.85, (144 + (hasPhoto ? 3 : 2) * 57) * Math.max(1, fontScale));
  function choose(action: () => void) {
    onOpenChange(false);
    action();
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent closeOnBackdropPress style={{ height: sheetHeight }}>
        <SheetHeader className="flex-row items-center justify-between gap-3">
          <SheetTitle className="flex-1 text-headline font-bold">{t("photoT")}</SheetTitle>
          <BackButton kind="close" onPress={() => onOpenChange(false)} accessibilityLabel={t("common:close")} />
        </SheetHeader>
        <MenuGroup>
          <MenuRow icon={Camera} label={t("takePhoto")} onPress={() => choose(onTakePhoto)} />
          <MenuDivider />
          <MenuRow icon={Image} label={t("chooseLib")} onPress={() => choose(onChoosePhoto)} />
          {hasPhoto ? <>
            <MenuDivider />
            <MenuRow icon={Trash2} label={t("removePhoto")} variant="danger" onPress={() => choose(onRemovePhoto)} />
          </> : null}
        </MenuGroup>
      </SheetContent>
    </Sheet>
  );
}
