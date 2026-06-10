import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Play, Trash2 } from "lucide-react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";
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

const MEDIA_URL = (
  process.env["EXPO_PUBLIC_MEDIA_URL"] ?? ""
).replace(/\/$/, "");

function buildVariantUrl(
  key: string,
  variant: "thumbnail" | "list" | "detail" | "fullscreen",
): string {
  if (!MEDIA_URL) return "";
  if (key.endsWith(".mp4") || key.endsWith(".mov")) {
    return `${MEDIA_URL}/${key}`;
  }
  const base = key.replace(/\/original\.(jpg|webp|jpeg)$/, "");
  return `${MEDIA_URL}/${base}/${variant}.jpg`;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

type ListingDraft = ListingsSchemas.ListingDraft;

interface DraftCardProps {
  draft: ListingDraft;
  brandName?: string;
  modelName?: string;
  onResume: (draft: ListingDraft) => void;
  onDiscard: (draftId: string) => void;
  isDiscarding?: boolean;
}

export function DraftCard({
  draft,
  brandName,
  modelName,
  onResume,
  onDiscard,
  isDiscarding,
}: DraftCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { t, i18n } = useTranslation();

  const payload = draft.payload;
  const attachedPhotos = useMemo(
    () => payload.photos?.filter((p) => p.key) ?? [],
    [payload.photos],
  );
  const photoCount = attachedPhotos.length;
  const coverKey = attachedPhotos[0]?.key;
  const imageUrl = coverKey ? buildVariantUrl(coverKey, "list") : null;

  const titleParts = [
    payload.year ? String(payload.year) : null,
    brandName,
    modelName,
  ].filter(Boolean);

  const identity = titleParts.length > 0
    ? titleParts.join(" ")
    : payload.brandId && payload.modelId
      ? t("unnamedDraft")
      : t("untitledDraft");

  // Approximate progress using the last completed numeric step (1-7).
  const lastStep = payload.currentStep ?? 0;
  const progressPercent = Math.min(100, Math.round((lastStep / 7) * 100));

  return (
    <>
      <Pressable
        className="active:opacity-90"
        onPress={() => onResume(draft)}
        accessibilityRole="button"
        accessibilityLabel={`${t("continueListing")} ${identity}`}
      >
        <View className="flex-row gap-3 px-4 py-3">
          {/* Cover image */}
          <View className="h-[100px] w-[140px] overflow-hidden rounded-lg bg-muted">
            {imageUrl && !imageFailed ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 140, height: 100 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Icon as={Play} className="size-6 text-muted-foreground" />
              </View>
            )}
          </View>

          {/* Text content */}
          <View className="flex-1 justify-between py-0.5">
            <View className="gap-1">
              <Text
                className="text-base font-semibold text-foreground leading-5"
                numberOfLines={2}
              >
                {identity}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t("updated")} {formatDate(draft.updatedAt, i18n.language)}
                {photoCount > 0 ? ` · ${photoCount} ${t("photos")}` : ""}
              </Text>
            </View>

            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  {t("stepCount", { step: lastStep })}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {progressPercent}%
                </Text>
              </View>
              <Progress value={progressPercent} className="h-1" />
            </View>

            <View className="flex-row gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onPress={() => onResume(draft)}
              >
                <Icon as={Play} className="size-4 text-primary-foreground" />
                <Text>{t("continueListing")}</Text>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onPress={() => setShowConfirm(true)}
                disabled={isDiscarding}
              >
                <Icon as={Trash2} className="size-4 text-destructive" />
                <Text>{t("discard")}</Text>
              </Button>
            </View>
          </View>
        </View>
      </Pressable>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardListingTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("discardListingDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDiscarding} onPress={() => setShowConfirm(false)}>
              <Text>{t("cancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDiscarding}
              onPress={() => {
                onDiscard(draft.id);
                setShowConfirm(false);
              }}
              className="bg-destructive"
            >
              <Text className="text-destructive-foreground">
                {isDiscarding ? t("discarding") : t("discard")}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
