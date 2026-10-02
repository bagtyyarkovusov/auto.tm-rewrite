import { useState } from "react";
import { Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ChevronLeft, Mail, Phone } from "lucide-react-native";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";

import { supportContacts } from "../src/config/supportContacts";
import { useSafeBack } from "../src/navigation/useSafeBack";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type Channel = "email" | "phone";

interface ContactRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
}

/** A row that opens a contact. The value stays selectable for copying. */
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
        <Text className="text-base text-foreground">{label}</Text>
        <Text selectable className="text-[13px] text-muted-foreground">
          {value}
        </Text>
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
      // No mail app or dialer on this device. The value stays on screen.
      setFailed(channel);
    }
  };

  return (
    <SafeScreen>
      <View className="px-4 pb-3 flex-row items-center gap-2">
        <Button
          variant="ghost"
          className="h-11 w-11"
          size="icon"
          onPress={goBack}
          accessibilityLabel={t("common:back")}
        >
          <Icon as={ChevronLeft} className="size-6 text-foreground" />
        </Button>
        <Text className="text-2xl font-heading text-foreground">{t("help")}</Text>
      </View>

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
        <Text accessibilityRole="alert" className="px-4 pt-3 text-sm text-destructive">
          {t(failed === "email" ? "noMailApp" : "noDialer")}
        </Text>
      ) : null}

      <Text className="px-4 py-2.5 text-[13px] text-muted-foreground">{t("includeV")}</Text>
    </SafeScreen>
  );
}
