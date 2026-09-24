import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { SignInMethodTabs } from "../../components/auth/SignInMethodTabs";
import { ApiError } from "../../src/api/client";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { normalizeEmail } from "../../src/auth/email";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function closeAuth() {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)");
}

export default function EmailScreen() {
  const params = useLocalSearchParams<{ email?: string; authRoot?: string }>();
  const isAuthRoot = firstParam(params.authRoot) === "1";
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, i18n } = useTranslation("auth");
  const [emailInput, setEmailInput] = useState(firstParam(params.email) ?? "");
  const [touched, setTouched] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const { mutateAsync: requestOtp, isPending: isSubmitting } = useRequestOtp();

  useEffect(() => {
    if (!isAuthRoot) return;

    return () => {
      useAuthIntentStore.getState().cancelSignIn();
    };
  }, [isAuthRoot]);

  const canonicalEmail = useMemo(() => normalizeEmail(emailInput), [emailInput]);
  const showError = touched && canonicalEmail === null;
  const canSubmit = canonicalEmail !== null && !isSubmitting;

  async function handleSubmit() {
    setTouched(true);

    if (!canonicalEmail || isSubmitting) return;

    setRequestError(null);

    try {
      const result = await requestOtp({ email: canonicalEmail });

      router.push({
        pathname: "/(auth)/otp",
        params: {
          method: "email",
          destination: canonicalEmail,
          requestId: result.requestId,
          resendInSeconds: String(result.resendInSeconds),
          ...(__DEV__ && result.testCode ? { testCode: result.testCode } : {}),
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setRequestError(getRequestOtpErrorCopy(error, t));
      } else {
        setRequestError(t("offline"));
      }
    }
  }

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
              onPress={closeAuth}
            >
              <Icon as={X} className="size-5 text-foreground" />
            </Button>
            <LocaleSwitcher />
          </View>

          <View className="flex-1">
            <View className="mt-8 gap-8">
              <BrandLogo />

              <SignInMethodTabs
                value="email"
                onChange={() => router.navigate("/(auth)/phone")}
              />

              <View className="gap-2">
                <Text className="text-2xl font-semibold leading-snug text-foreground">
                  {t("emailTitle")}
                </Text>
                <Text className="text-base leading-normal text-muted-foreground">
                  {t("emailHelper")}
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  {t("emailLabel")}
                </Text>
                <Input
                  accessibilityLabel={t("emailLabel")}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  autoFocus
                  keyboardType="email-address"
                  returnKeyType="send"
                  aria-invalid={showError || requestError !== null}
                  value={emailInput}
                  onBlur={() => setTouched(true)}
                  onChangeText={(value) => {
                    setEmailInput(value);
                    setRequestError(null);
                  }}
                  onSubmitEditing={() => void handleSubmit()}
                  placeholder={t("emailPlaceholder")}
                />
                <Text
                  className={
                    showError || requestError
                      ? "text-sm leading-snug text-destructive"
                      : "text-sm leading-snug text-muted-foreground"
                  }
                >
                  {requestError ?? (showError ? t("emailFormatError") : t("emailInputHelper"))}
                </Text>
              </View>

              <Button
                disabled={!canSubmit}
                size="lg"
                variant="brand"
                onPress={() => void handleSubmit()}
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

function getRequestOtpErrorCopy(
  error: ApiError,
  t: (key: string) => string,
): string {
  if (error.code === "VALIDATION_FAILED") return t("emailFormatError");
  if (error.code === "NETWORK_ERROR" || error.status === 0) return t("offline");
  if (error.code === "RATE_LIMITED" || error.status === 429) {
    return t("rateLimitedCode");
  }
  return t("requestFailed");
}
