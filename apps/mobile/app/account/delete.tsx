import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { useSafeBack } from "../../src/navigation/useSafeBack";
import { useDeleteAccount } from "../../src/api/identity/useDeleteAccount";
import { clearAuthSession } from "../../src/auth/session";

import { Button } from "@/components/ui/button";
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
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";

function formatDeletionDate(locale: string): string {
  const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function DeleteAccountScreen() {
  const { t, i18n } = useTranslation("account");
  const queryClient = useQueryClient();
  const deleteAccount = useDeleteAccount();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const goBack = useSafeBack("/(tabs)/services");

  const locale = i18n.language ?? "ru";
  const deletionDate = useMemo(() => formatDeletionDate(locale), [locale]);

  async function handleDelete() {
    setShowConfirm(false);

    try {
      await deleteAccount.mutateAsync();
      await clearAuthSession();
      queryClient.clear();
      setShowScheduled(true);
    } catch {
      // Error is available via deleteAccount.error; surface inline
    }
  }

  function handleScheduledDismiss() {
    setShowScheduled(false);
    router.replace("/(tabs)");
  }

  return (
    <SafeScreen>
      {/* Header */}
      <View className="px-4 pb-3 flex-row items-center gap-2">
        <Button
          variant="ghost"
          className="h-11 w-11"
          size="icon"
          onPress={goBack}
          accessibilityLabel={t("common:back", { defaultValue: "Back" })}
        >
          <Icon as={ChevronLeft} className="size-6 text-foreground" />
        </Button>
        <Text className="text-2xl font-heading text-foreground">
          {t("deleteAccount")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          <Text className="text-base text-foreground">
            {t("deleteAccountDescription")}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t("deleteAccountGraceDetail", {
              date: deletionDate,
              defaultValue:
                "After confirmation your account will be scheduled for deletion on {{date}}. You can restore it by logging in again before that date.",
            })}
          </Text>
        </View>

        <View className="py-6">
          <Button
            variant="destructive"
            size="pill"
            disabled={deleteAccount.isPending}
            onPress={() => setShowConfirm(true)}
            accessibilityLabel={t("deleteAccount")}
          >
            <Icon as={Trash2} className="size-5 text-destructive-foreground mr-2" />
            <Text>{t("deleteAccount")}</Text>
          </Button>
        </View>

        {deleteAccount.isError ? (
          <View className="py-2">
            <Text className="text-sm text-destructive text-center">
              {t("deleteAccountFailed", { defaultValue: "Could not delete account. Please try again." })}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Destructive confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAccountConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAccountConfirmDescription", { date: deletionDate })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowConfirm(false)}>
              <Text>{t("deleteAccountCancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onPress={handleDelete}
            >
              <Text className="text-destructive-foreground">
                {t("deleteAccountConfirmAction")}
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-delete scheduled messaging */}
      <AlertDialog open={showScheduled} onOpenChange={setShowScheduled}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAccountScheduledTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAccountScheduledMessage", { date: deletionDate })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onPress={handleScheduledDismiss}>
              <Text>{t("common:done", { defaultValue: "Done" })}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeScreen>
  );
}
