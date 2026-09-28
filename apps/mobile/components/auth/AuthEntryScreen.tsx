import * as Linking from "expo-linking";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "../../src/auth/BrandLogo";
import { closeAuth } from "../../src/auth/closeAuth";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";

import { type SignInMethod, SignInMethodTabs } from "./SignInMethodTabs";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

interface AuthEntryScreenProps {
  method: SignInMethod;
  title: string;
  helper: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  children: ReactNode;
}

export function AuthEntryScreen({
  method,
  title,
  helper,
  canSubmit,
  isSubmitting,
  onSubmit,
  children,
}: AuthEntryScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, i18n } = useTranslation("auth");

  function openLegalPage(kind: "terms" | "privacy") {
    void Linking.openURL(`https://auto.tm/${i18n.language}/legal/${kind}`);
  }

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-4">
          <View className="flex-row items-center justify-between py-4">
            <Button
              accessibilityLabel={t("close")}
              className="h-11 w-11"
              size="icon"
              variant="ghost"
              onPress={() => closeAuth(router)}
            >
              <Icon as={X} className="size-5 text-foreground" />
            </Button>
            <LocaleSwitcher />
          </View>

          <View className="flex-1">
            <View className="mt-8 gap-8">
              <BrandLogo />

              <SignInMethodTabs
                value={method}
                onChange={(nextMethod) =>
                  router.navigate(
                    nextMethod === "email"
                      ? "/(auth)/email"
                      : "/(auth)/phone",
                  )
                }
              />

              <View className="gap-2">
                <Text className="text-2xl font-semibold leading-snug text-foreground">
                  {title}
                </Text>
                <Text className="text-base leading-normal text-muted-foreground">
                  {helper}
                </Text>
              </View>

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

            <Text className="mt-auto pb-6 text-xs leading-normal text-muted-foreground">
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
