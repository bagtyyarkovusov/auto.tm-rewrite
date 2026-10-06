import * as Linking from "expo-linking";
import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useSafeBack } from "../src/navigation/useSafeBack";
import { useNotificationPermissionState } from "../src/notifications/useNotificationPermissionState";

import { MenuDivider, MenuFooter, MenuGroup, MenuRow } from "@/components/account/MenuRow";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { BackButton, StackHeader } from "@/components/navigation/StackHeader";
import { Text } from "@/components/ui/text";

/**
 * Message notifications state, read from the device permission. A statement,
 * not a switch: the User changes it in system settings. This screen never
 * asks for the permission; that stays after the first chat action.
 */
export default function NotificationsScreen() {
  const { t } = useTranslation(["account", "common"]);
  const goBack = useSafeBack("/(tabs)/services");
  const permission = useNotificationPermissionState();

  const value =
    permission === null
      ? ""
      : t(permission === "granted" ? "notificationsOn" : "notificationsOff");

  return (
    <SafeScreen>
      <StackHeader
        large
        title={t("notifications")}
        leading={<BackButton onPress={goBack} accessibilityLabel={t("common:back")} />}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-6 pt-1">
        {/* One card: the state as a plain row, then the way to change it. */}
        <MenuGroup>
          <View
            accessible
            accessibilityLabel={
              value ? `${t("messageNotifications")}, ${value}` : t("messageNotifications")
            }
            className="min-h-14 flex-row items-center gap-3 px-4 py-2"
          >
            <Text className="min-w-0 flex-1 text-body text-foreground">
              {t("messageNotifications")}
            </Text>
            <Text className="text-body text-muted-foreground">{value}</Text>
          </View>
          <MenuDivider inset="text" />
          <MenuRow
            label={t("openSystemSettings")}
            external
            onPress={() => void Linking.openSettings()}
          />
        </MenuGroup>

        <MenuFooter>
          <Text className="text-footnote text-muted-foreground">
            {t("notificationsMuteHint")}
          </Text>
        </MenuFooter>
      </ScrollView>
    </SafeScreen>
  );
}
