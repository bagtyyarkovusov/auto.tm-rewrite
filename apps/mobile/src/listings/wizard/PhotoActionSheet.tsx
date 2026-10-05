import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import type { StagedPhoto } from "../uploadStaging/types";
import { NEEDS_ATTENTION_STATES } from "../uploadStaging/uploadCounts";

import { canRetryPhoto, photoFailureReason, photoPosition } from "./photoLabels";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 52;
const REASON_HEIGHT = 56;

interface ActionRow {
  key: string;
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
}

interface PhotoActionSheetProps {
  open: boolean;
  /** The tapped photo, or null when the sheet is closed. */
  photo: StagedPhoto | null;
  index: number;
  total: number;
  onOpenChange: (open: boolean) => void;
  onSetAsCover: (index: number) => void;
  onMoveEarlier: (index: number) => void;
  onMoveLater: (index: number) => void;
  onRemove: (photoId: string) => void;
  onRetry: (photoId: string) => void;
}

/**
 * What the seller can do with one photo: Retry for a retryable failure, Set as
 * cover and Move earlier unless it is already first, Move later unless it is
 * last, and Remove. Set as cover is not offered for a failed or lost photo;
 * Move earlier and dragging can still put one first.
 */
export function PhotoActionSheet({
  open,
  photo,
  index,
  total,
  onOpenChange,
  onSetAsCover,
  onMoveEarlier,
  onMoveLater,
  onRemove,
  onRetry,
}: PhotoActionSheetProps) {
  const { t } = useTranslation();
  // The iOS full-window overlay gives an auto-height sheet no room, so this one sets a height.
  const maxHeight = useWindowDimensions().height * 0.85;

  const needsAttention = photo ? NEEDS_ATTENTION_STATES.includes(photo.state) : false;
  const rows: ActionRow[] = [];
  if (photo) {
    const act = (run: () => void) => () => {
      run();
      onOpenChange(false);
    };
    if (canRetryPhoto(photo)) {
      rows.push({ key: "retry", label: t("retry"), icon: RotateCcw, onPress: act(() => onRetry(photo.photoId)) });
    }
    if (index > 0 && !needsAttention) {
      rows.push({ key: "cover", label: t("setAsCover"), icon: Star, onPress: act(() => onSetAsCover(index)) });
    }
    if (index > 0) {
      rows.push({ key: "earlier", label: t("moveEarlier"), icon: ArrowLeft, onPress: act(() => onMoveEarlier(index)) });
    }
    if (index < total - 1) {
      rows.push({ key: "later", label: t("moveLater"), icon: ArrowRight, onPress: act(() => onMoveLater(index)) });
    }
    rows.push({ key: "remove", label: t("remove"), icon: Trash2, destructive: true, onPress: act(() => onRemove(photo.photoId)) });
  }

  const sheetHeight = Math.min(
    maxHeight,
    150 + ROW_HEIGHT * (rows.length + 1) + (needsAttention ? REASON_HEIGHT : 0),
  );

  return (
    <Sheet open={open && photo !== null} onOpenChange={onOpenChange}>
      <SheetContent closeOnBackdropPress style={{ height: sheetHeight }}>
        <View testID="photo-actions-sheet" className="gap-4">
          <SheetHeader>
            {/* No photo while the sheet closes: a position then would read "Photo 0 of N". */}
            <SheetTitle numberOfLines={1}>{photo ? photoPosition(t, index, total) : ""}</SheetTitle>
            {photo && needsAttention ? (
              <Text className="text-sm text-destructive">{photoFailureReason(t, photo)}</Text>
            ) : null}
          </SheetHeader>
          {rows.map((row) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              className="min-h-12 flex-row items-center gap-3 py-3 active:opacity-70"
              onPress={row.onPress}
            >
              <Icon
                as={row.icon}
                className={cn("size-5", row.destructive ? "text-destructive" : "text-foreground")}
              />
              <Text className={cn("text-base", row.destructive ? "text-destructive" : "text-foreground")}>
                {row.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          <Text>{t("cancel")}</Text>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
