import { Fragment, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { useSafeBack } from "../../src/navigation/useSafeBack";
import { useDeleteAccount } from "../../src/api/identity/useDeleteAccount";
import { clearAuthSession } from "../../src/auth/session";
import { formatDeletionDateFromNow } from "../../src/auth/formatDeletionDate";
import { localeTag } from "../../src/i18n/resources";

import { MenuDivider, MenuGroup, MenuSectionLabel } from "@/components/account/MenuRow";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { BackButton, StackHeader } from "@/components/navigation/StackHeader";

export default function DeleteAccountScreen() {
  const { t, i18n } = useTranslation("account");
  const queryClient = useQueryClient();
  const deleteAccount = useDeleteAccount();
  const [understood, setUnderstood] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const goBack = useSafeBack("/profile");

  const locale = localeTag(i18n.language);
  const deletionDate = useMemo(() => formatDeletionDateFromNow(locale), [locale]);
  // Russian opens this line with the date, so it keeps its "г." period.
  const erasedOnDate = useMemo(
    () => formatDeletionDateFromNow(locale, { midSentence: true }),
    [locale],
  );
  const consequences = [
    t("deleteAccountSignedOut"),
    t("deleteAccountListingsArchived"),
    t("deleteAccountChatsStay"),
    t("deleteAccountErasedOn", { date: erasedOnDate }),
    t("deleteAccountRestoreBefore"),
  ];

  async function handleDelete() {
    setShowConfirm(false);

    try {
      await deleteAccount.mutateAsync();
    } catch {
      // deleteAccount.isError shows the message inline. The User stays signed in
      // unless the session itself had ended, which sends them to sign-in.
      return;
    }
    await clearAuthSession();
    queryClient.clear();
    // Cabinet sits under the scheduled screen, so neither Back nor Done can
    // return to a signed-in screen.
    router.dismissTo("/(tabs)/services");
    router.push("/account/deletion-scheduled");
  }

  return (
    <SafeScreen>
      {/* Header */}
      <StackHeader
        title={t("deleteAccount")}
        leading={
          <BackButton
            onPress={goBack}
            accessibilityLabel={t("common:back", { defaultValue: "Back" })}
          />
        }
      />

      <ScrollView className="flex-1" contentContainerClassName="gap-6 pb-6 pt-1">
        <Text className="px-8 text-body text-foreground">
          {t("deleteAccountDescription")}
        </Text>

        {/* What happens, one fact per row on a raised card. */}
        <View>
          <MenuSectionLabel>{t("deleteAccountWhatHappens")}</MenuSectionLabel>
          <MenuGroup>
            {consequences.map((line, index) => (
              <Fragment key={line}>
                {index > 0 ? <MenuDivider inset="text" /> : null}
                <Text className="px-4 py-3 text-callout text-foreground">{line}</Text>
              </Fragment>
            ))}
          </MenuGroup>
        </View>

        <MenuGroup>
          <Pressable
            onPress={() => setUnderstood((value) => !value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: understood }}
            accessibilityLabel={t("deleteAccountUnderstand")}
            className="min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-secondary"
          >
            <Checkbox checked={understood} pointerEvents="none" accessible={false} />
            <Text className="flex-1 text-body text-foreground">
              {t("deleteAccountUnderstand")}
            </Text>
          </Pressable>
        </MenuGroup>

        {/* The destructive token, never brand red: this is not the primary action. */}
        <View className="px-4">
          <Button
            variant="destructive"
            size="pill"
            disabled={!understood || deleteAccount.isPending}
            onPress={() => setShowConfirm(true)}
            accessibilityLabel={t("deleteAccount")}
          >
            <Icon as={Trash2} className="mr-2 size-5" />
            <Text>{t("deleteAccount")}</Text>
          </Button>
        </View>

        {deleteAccount.isError ? (
          <View className="px-8">
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className="text-center text-callout text-destructive"
            >
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
    </SafeScreen>
  );
}
