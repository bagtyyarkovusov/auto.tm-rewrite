import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useSafeBack } from "../src/navigation/useSafeBack";
import { LocaleSwitcher } from "../src/auth/LocaleSwitcher";
import { useLogout } from "../src/auth/useLogout";

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
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";

function openLegalPage(locale: string, kind: "terms" | "privacy") {
  void Linking.openURL(`https://auto.tm/${locale}/legal/${kind}`);
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation("account");
  const logout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const goBack = useSafeBack("/(tabs)/services");

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout.mutate();
  };

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
          {t("settings")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Language */}
        <View className="gap-2 py-4">
          <Text className="text-sm font-medium text-muted-foreground">
            {t("language")}
          </Text>
          <LocaleSwitcher />
        </View>

        <Separator className="bg-border" />

        {/* Privacy Policy */}
        <Pressable
          onPress={() => openLegalPage(i18n.language, "privacy")}
          className="flex-row items-center justify-between py-4 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={t("privacyPolicy")}
        >
          <Text className="text-base text-foreground">
            {t("privacyPolicy")}
          </Text>
          <Icon
            as={ChevronRight}
            className="size-5 text-muted-foreground"
          />
        </Pressable>

        <Separator className="bg-border" />

        {/* Terms of Service */}
        <Pressable
          onPress={() => openLegalPage(i18n.language, "terms")}
          className="flex-row items-center justify-between py-4 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={t("termsOfService")}
        >
          <Text className="text-base text-foreground">
            {t("termsOfService")}
          </Text>
          <Icon
            as={ChevronRight}
            className="size-5 text-muted-foreground"
          />
        </Pressable>

        <Separator className="bg-border" />

        {/* Delete account entry */}
        <Pressable
          onPress={() => router.push("/account/delete")}
          className="flex-row items-center justify-between py-4 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={t("deleteAccount")}
        >
          <Text className="text-base text-foreground">
            {t("deleteAccount")}
          </Text>
          <Icon
            as={ChevronRight}
            className="size-5 text-muted-foreground"
          />
        </Pressable>

        <Separator className="bg-border" />

        {/* Logout */}
        <View className="py-6">
          <Button
            variant="destructive"
            size="pill"
            onPress={() => setShowLogoutConfirm(true)}
            accessibilityLabel={t("logout")}
          >
            <Text>{t("logout")}</Text>
          </Button>
        </View>
      </ScrollView>

      {/* Logout confirmation */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logoutConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logoutConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowLogoutConfirm(false)}>
              <Text>{t("logoutConfirmCancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleLogout}>
              <Text>{t("logoutConfirmAction")}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeScreen>
  );
}
