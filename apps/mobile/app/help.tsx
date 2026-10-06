import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Mail, Phone } from "lucide-react-native";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";

import { supportContacts } from "../src/config/supportContacts";
import { useSafeBack } from "../src/navigation/useSafeBack";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { BackButton, StackHeader } from "@/components/navigation/StackHeader";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Channel = "email" | "phone";

interface ContactRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
}

/** A row that opens a contact. */
function ContactRow({ icon, label, value, onPress }: ContactRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      className="min-h-14 flex-row items-center gap-3.5 px-4 py-2 active:bg-secondary"
      onPress={onPress}
    >
      <Icon as={icon} className="size-6 text-muted-foreground" />
      <View className="min-w-0 flex-1">
        <Text className="text-body text-foreground">{label}</Text>
        <Text className="text-footnote text-muted-foreground">{value}</Text>
      </View>
    </Pressable>
  );
}

export default function HelpScreen() {
  const { t } = useTranslation(["support", "common"]);
  const goBack = useSafeBack("/(tabs)/services");
  const [failed, setFailed] = useState<Channel | null>(null);

  const open = async (channel: Channel, url: string) => {
    setFailed(null);
    try {
      await Linking.openURL(url);
    } catch {
      // No mail app or dialer on this device. The value is shown for copying.
      setFailed(channel);
    }
  };

  return (
    <SafeScreen>
      <StackHeader
        large
        title={t("help")}
        leading={<BackButton onPress={goBack} accessibilityLabel={t("common:back")} />}
      />

      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <ContactRow
          icon={Mail}
          label={t("emailUs")}
          value={supportContacts.email}
          onPress={() => void open("email", `mailto:${supportContacts.email}`)}
        />
        <View className="ml-[54px] h-px bg-border" />
        <ContactRow
          icon={Phone}
          label={t("callUs")}
          value={supportContacts.phoneShown}
          onPress={() => void open("phone", `tel:${supportContacts.phoneDialled}`)}
        />

        {failed ? (
          // Outside the pressable rows, so a long press selects the value.
          <View className="gap-1 px-4 pt-3">
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className="text-callout text-destructive"
            >
              {t(failed === "email" ? "noMailApp" : "noDialer")}
            </Text>
            <Text selectable className="text-body text-foreground">
              {failed === "email" ? supportContacts.email : supportContacts.phoneShown}
            </Text>
          </View>
        ) : null}

        <Text className="px-4 py-2.5 text-footnote text-muted-foreground">{t("includeV")}</Text>
      </ScrollView>
    </SafeScreen>
  );
}
