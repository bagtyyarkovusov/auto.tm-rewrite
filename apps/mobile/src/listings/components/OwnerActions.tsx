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
  | { kind: "markSold"; title: string; description: string }
  | { kind: "archive"; title: string; description: string }
  | { kind: "republish"; title: string; description: string }
  | { kind: "delete"; title: string; description: string };

interface OwnerActionsProps {
  listingId: string;
  status: ListingStatus;
}

export function OwnerActions({ listingId, status }: OwnerActionsProps) {
  const router = useRouter();
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
          onError: () => setConfirmAction(null),
        });
        break;
      case "archive":
        archive.mutate(listingId, {
          onError: () => setConfirmAction(null),
        });
        break;
      case "republish":
        republish.mutate(listingId, {
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
          <Text>Edit</Text>
        </Button>

        {isActive && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[45%]"
            onPress={() =>
              setConfirmAction({
                kind: "markSold",
                title: "Mark as sold",
                description:
                  "This car is sold. Is the buyer from AutoTM? This action cannot be undone from here.",
              })
            }
            disabled={isPending}
          >
            <Icon as={CheckCircle} className="size-4 text-foreground" />
            <Text>Mark sold</Text>
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
                title: "Archive listing",
                description:
                  "Archiving hides this listing from the public feed. You can republish it later.",
              })
            }
            disabled={isPending}
          >
            <Icon as={Archive} className="size-4 text-foreground" />
            <Text>Archive</Text>
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
                title: "Republish listing",
                description:
                  "This will make your listing visible again in the public feed.",
              })
            }
            disabled={isPending}
          >
            <Icon as={RotateCcw} className="size-4 text-foreground" />
            <Text>Republish</Text>
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
              title: "Delete listing",
              description:
                "This will permanently remove your listing. Photos and data cannot be recovered.",
            })
          }
          disabled={isPending}
        >
          <Icon as={Trash2} className="size-4 text-destructive-foreground" />
          <Text>Delete</Text>
        </Button>
      </View>

      {/* Mutation error banner */}
      {(markSold.isError || archive.isError || republish.isError || deleteListing.isError) && (
        <View className="rounded-md bg-destructive/10 px-3 py-2">
          <Text className="text-sm text-destructive">
            Action failed. Pull down to refresh or try again.
          </Text>
        </View>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={closeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.title ?? ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description ?? ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onPress={closeDialog}>
              <Text>Cancel</Text>
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
                {isPending ? "Working..." : "Confirm"}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
