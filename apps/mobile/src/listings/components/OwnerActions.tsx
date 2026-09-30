import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Pencil, CheckCircle, MoreHorizontal } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

type ListingStatus = ListingsSchemas.ListingDetail["status"];

import { useArchiveListing } from "../../api/listings/useArchiveListing";
import { useDeleteListing } from "../../api/listings/useDeleteListing";
import { useMarkSold } from "../../api/listings/useMarkSold";
import { useRepublishListing } from "../../api/listings/useRepublishListing";
import { shareListing } from "../detail/shareListing";

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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type ConfirmAction =
  | { kind: "markSold"; titleKey: string; descriptionKey: string }
  | { kind: "archive"; titleKey: string; descriptionKey: string }
  | { kind: "republish"; titleKey: string; descriptionKey: string }
  | { kind: "delete"; titleKey: string; descriptionKey: string };

interface OwnerActionsProps {
  listingId: string;
  status: ListingStatus;
  mode: "bar" | "menu";
}

export function OwnerActions({ listingId, status, mode }: OwnerActionsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

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
      {mode === "bar" && (
        <View className="flex-row gap-2 px-4 py-3">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[45%]"
            onPress={() => router.push(`/listings/${listingId}/edit`)}
            disabled={isPending || !(isActive || isSold || isArchived)}
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
        </View>
      )}
      {mode === "menu" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-background/90"
              accessibilityLabel={t("detailOptions")}
            >
              <Icon as={MoreHorizontal} className="size-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {(isActive || isSold) && (
              <DropdownMenuItem
                accessibilityRole="button"
                disabled={isPending}
                onPress={() =>
                  setConfirmAction({
                    kind: "archive",
                    titleKey: "archiveListing",
                    descriptionKey: "archiveListingDescription",
                  })
                }
              >
                <Text>{t("archiveListing")}</Text>
              </DropdownMenuItem>
            )}
            {isArchived && (
              <DropdownMenuItem
                accessibilityRole="button"
                disabled={isPending}
                onPress={() =>
                  setConfirmAction({
                    kind: "republish",
                    titleKey: "republishListing",
                    descriptionKey: "republishListingDescription",
                  })
                }
              >
                <Text>{t("republishListing")}</Text>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              accessibilityRole="button"
              onPress={() => void shareListing(listingId, t("shareMessage"))}
            >
              <Text>{t("share")}</Text>
            </DropdownMenuItem>
            <DropdownMenuItem
              accessibilityRole="button"
              variant="destructive"
              disabled={isPending}
              onPress={() =>
                setConfirmAction({
                  kind: "delete",
                  titleKey: "deleteListing",
                  descriptionKey: "deleteListingDescription",
                })
              }
            >
              <Text>{t("delete")}</Text>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Mutation error banner */}
      {(markSold.isError ||
        archive.isError ||
        republish.isError ||
        deleteListing.isError) && (
        <View className="rounded-md bg-destructive/10 px-3 py-2">
          <Text className="text-sm text-destructive">{t("actionFailed")}</Text>
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
                confirmAction?.kind === "delete" ? "bg-destructive" : undefined
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
