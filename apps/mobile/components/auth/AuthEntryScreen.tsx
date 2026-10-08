import * as Linking from "expo-linking";
import { type ReactNode, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { legalPageUrl } from "../../src/config/publicWebUrl";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";

import { SignInMethodContent } from "./SignInMethodContent";
import { type SignInMethod, SignInMethodTabs } from "./SignInMethodTabs";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { BackButton, StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useLargeText } from "@/lib/font-scale";
import { THEME } from "@/lib/theme";

interface AuthEntryScreenProps {
  method: SignInMethod;
  title: string;
  helper: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  onMethodChange: (method: SignInMethod) => void;
  onClose: () => void;
  children: ReactNode;
}

export function AuthEntryScreen({
  method,
  title,
  helper,
  canSubmit,
  isSubmitting,
  onSubmit,
  onMethodChange,
  onClose,
  children,
}: AuthEntryScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, i18n } = useTranslation("auth");

  const largeText = useLargeText();
  const scroll = useRef<ScrollView>(null);
  // With large text the field sits low enough for the keyboard to cover it.
  useEffect(() => {
    if (!largeText) return;
    const shown = Keyboard.addListener("keyboardDidShow", () => scroll.current?.scrollToEnd({ animated: true }));
    return () => shown.remove();
  }, [largeText]);

  function openLegalPage(kind: "terms" | "privacy") {
    void Linking.openURL(legalPageUrl(i18n.language, kind));
  }

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-4">
          <StackHeader
            className="px-0"
            leading={
              <BackButton
                kind="close"
                accessibilityLabel={t("common:close")}
                onPress={onClose}
              />
            }
            trailing={<LocaleSwitcher />}
          />

          {/* The form scrolls, so at a large font size the field and the
              button can be brought above the keyboard. At the default size it
              fits and does not move. */}
          <ScrollView
            ref={scroll}
            className="flex-1"
            contentContainerClassName="flex-grow"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View className={largeText ? "mt-4 gap-5" : "mt-8 gap-8"}>
              {largeText ? null : <BrandLogo />}

              <SignInMethodTabs
                value={method}
                onChange={onMethodChange}
              />

              <SignInMethodContent method={method}
                phone={<View className="gap-2"><Text className="text-headline font-semibold leading-snug text-foreground">{method === "phone" ? title : t("phoneTitle")}</Text><Text className="text-body leading-normal text-muted-foreground">{method === "phone" ? helper : t("phoneHelper")}</Text></View>}
                email={<View className="gap-2"><Text className="text-headline font-semibold leading-snug text-foreground">{method === "email" ? title : t("emailTitle")}</Text><Text className="text-body leading-normal text-muted-foreground">{method === "email" ? helper : t("emailHelper")}</Text></View>}
              />

              {children}

              <Button
                disabled={!canSubmit}
                size="lg"
                variant="brand"
                onPress={() => void onSubmit()}
              >
                {isSubmitting ? (
                  <ActivityIndicator
                    color={`hsl(${THEME[isDark ? "dark" : "light"].primaryForeground})`}
                  />
                ) : (
                  <Text>{t("getCode")}</Text>
                )}
              </Button>
            </View>

            <Text className="mt-auto pb-6 text-caption leading-normal text-muted-foreground">
              {t("legalPrefix")} {" "}
              <Text
                className="font-medium text-info-500 underline"
                onPress={() => openLegalPage("terms")}
              >
                {t("terms")}
              </Text>{" "}
              {t("legalAnd")} {" "}
              <Text
                className="font-medium text-info-500 underline"
                onPress={() => openLegalPage("privacy")}
              >
                {t("privacy")}
              </Text>
              .
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
