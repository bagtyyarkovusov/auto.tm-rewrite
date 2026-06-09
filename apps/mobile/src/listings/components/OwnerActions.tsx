import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  Pencil,
  CheckCircle,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

type ListingStatus = ListingsSchemas.ListingDetail["status"];

import { useArchiveListing } from "../../api/listings/useArchiveListing";
import { useDeleteListing } from "../../api/listings/useDeleteListing";
import { useMarkSold } from "../../api/listings/useMarkSold";
import { useRepublishListing } from "../../api/listings/useRepublishListing";

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

type ConfirmAction =
  | { kind: "markSold"; titleKey: string; descriptionKey: string }
  | { kind: "archive"; titleKey: string; descriptionKey: string }
  | { kind: "republish"; titleKey: string; descriptionKey: string }
  | { kind: "delete"; titleKey: string; descriptionKey: string };

interface OwnerActionsProps {
  listingId: string;
  status: ListingStatus;
}

export function OwnerActions({ listingId, status }: OwnerActionsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const markSold = useMarkSold();
  const archive = useArchiveListing();
  const republish = useRepublishListing();
  const deleteListing = useDeleteListing();

  const isActive = status === Enums.ListingStatus.Active;
  const isSold = status === Enums.ListingStatus.Sold;
  const isArchived = status === Enums.ListingStatus.Archived;

  const isPending =
    markSold.isPending ||
    archive.isPending ||
    republish.isPending ||
    deleteListing.isPending;

  const handleConfirm = () => {
    if (!confirmAction) return;

    switch (confirmAction.kind) {
      case "markSold":
        markSold.mutate(listingId, {
          onSuccess: () => setConfirmAction(null),
          onError: () => setConfirmAction(null),
        });
        break;
      case "archive":
        archive.mutate(listingId, {
          onSuccess: () => setConfirmAction(null),
          onError: () => setConfirmAction(null),
        });
        break;
      case "republish":
        republish.mutate(listingId, {
          onSuccess: () => setConfirmAction(null),
          onError: () => setConfirmAction(null),
        });
        break;
      case "delete":
        deleteListing.mutate(listingId, {
          onSuccess: () => {
            setConfirmAction(null);
            router.back();
          },
          onError: () => setConfirmAction(null),
        });
        break;
    }
  };

  const closeDialog = () => {
    if (isPending) return;
    setConfirmAction(null);
  };

  return (
    <View className="gap-2">
      {/* Primary owner actions row */}
      <View className="flex-row flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 min-w-[45%]"
          onPress={() => router.push(`/listings/${listingId}/edit`)}
          disabled={isPending}
        >
          <Icon as={Pencil} className="size-4 text-foreground" />
          <Text>{t("edit")}</Text>
        </Button>

        {isActive && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[45%]"
            onPress={() =>
              setConfirmAction({
                kind: "markSold",
                titleKey: "markAsSold",
                descriptionKey: "markAsSoldDescription",
              })
            }
            disabled={isPending}
          >
            <Icon as={CheckCircle} className="size-4 text-foreground" />
            <Text>{t("markAsSold")}</Text>
          </Button>
        )}

        {(isActive || isSold) && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[45%]"
            onPress={() =>
              setConfirmAction({
                kind: "archive",
                titleKey: "archiveListing",
                descriptionKey: "archiveListingDescription",
              })
            }
            disabled={isPending}
          >
            <Icon as={Archive} className="size-4 text-foreground" />
            <Text>{t("archiveListing")}</Text>
          </Button>
        )}

        {isArchived && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[45%]"
            onPress={() =>
              setConfirmAction({
                kind: "republish",
                titleKey: "republishListing",
                descriptionKey: "republishListingDescription",
              })
            }
            disabled={isPending}
          >
            <Icon as={RotateCcw} className="size-4 text-foreground" />
            <Text>{t("republishListing")}</Text>
          </Button>
        )}
      </View>

      {/* Destructive action separated */}
      <View className="pt-1">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onPress={() =>
            setConfirmAction({
              kind: "delete",
              titleKey: "deleteListing",
              descriptionKey: "deleteListingDescription",
            })
          }
          disabled={isPending}
        >
          <Icon as={Trash2} className="size-4 text-destructive-foreground" />
          <Text>{t("delete")}</Text>
        </Button>
      </View>

      {/* Mutation error banner */}
      {(markSold.isError || archive.isError || republish.isError || deleteListing.isError) && (
        <View className="rounded-md bg-destructive/10 px-3 py-2">
          <Text className="text-sm text-destructive">
            {t("actionFailed")}
          </Text>
        </View>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction ? t(confirmAction.titleKey) : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction ? t(confirmAction.descriptionKey) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onPress={closeDialog}>
              <Text>{t("cancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onPress={handleConfirm}
              className={
                confirmAction?.kind === "delete"
                  ? "bg-destructive"
                  : undefined
              }
            >
              <Text
                className={
                  confirmAction?.kind === "delete"
                    ? "text-destructive-foreground"
                    : undefined
                }
              >
                {isPending ? t("working") : t("confirm")}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
