import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { PhoneInput } from "../../components/auth/PhoneInput";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { ApiError } from "../../src/api/client";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import {
  displayPhoneFromCanonical,
  formatLocalPhone,
  normalizeTmPhone,
  validateTmPhone,
} from "../../src/auth/phone";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { THEME } from "@/lib/theme";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

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

export default function PhoneScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
  }>();
  const initialPhone = firstParam(params.phone);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, i18n } = useTranslation("auth");

  const [phoneDisplay, setPhoneDisplay] = useState(
    initialPhone ? displayPhoneFromCanonical(initialPhone) : "",
  );
  const [touched, setTouched] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { mutateAsync: requestOtp, isPending: isSubmitting } = useRequestOtp();

  const canonicalPhone = useMemo(
    () => normalizeTmPhone(phoneDisplay),
    [phoneDisplay],
  );
  const phoneValidation = validateTmPhone(phoneDisplay);
  const canSubmit = canonicalPhone !== null && !isSubmitting;

  const helperText = useMemo(() => {
    if (requestError) {
      return requestError;
    }

    if (!touched || phoneValidation === null) {
      return t("phoneInputHelper");
    }

    return phoneValidation === "incomplete"
      ? t("phoneIncompleteError")
      : t("phoneFormatError");
  }, [t, phoneValidation, requestError, touched]);

  const showError = useMemo(() => {
    if (requestError) return true;
    if (!touched) return false;
    // Only show aggressive red after blur OR when 8+ digits have been entered
    const localDigits = phoneDisplay.replace(/\D/g, "");
    if (localDigits.length >= 8) return phoneValidation !== null;
    return phoneValidation === "format";
  }, [requestError, touched, phoneDisplay, phoneValidation]);

  function handlePhoneChange(value: string) {
    setPhoneDisplay(formatLocalPhone(value));
    setRequestError(null);
  }

  async function handleSubmit() {
    setTouched(true);

    if (!canonicalPhone || isSubmitting) {
      return;
    }

    setRequestError(null);

    try {
      const result = await requestOtp({ phone: canonicalPhone });

      router.push({
        pathname: "/(auth)/otp",
        params: {
          phone: canonicalPhone,
          requestId: result.requestId,
          resendInSeconds: String(result.resendInSeconds),
          ...(result.testCode ? { testCode: result.testCode } : {}),
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
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              onPress={closeAuth}
            >
              <Icon as={X} className="size-5 text-foreground" />
            </Button>
            <LocaleSwitcher />
          </View>

          <View className="flex-1">
            <View className="mt-8 gap-8">
              <BrandLogo />

              <View className="gap-2">
                <Text className="text-2xl font-semibold leading-snug text-foreground">
                  {t("phoneTitle")}
                </Text>
                <Text className="text-base leading-normal text-muted-foreground">
                  {t("phoneHelper")}
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  {t("phoneLabel")}
                </Text>
                <PhoneInput
                  accessibilityLabel={t("phoneLabel")}
                  hasError={showError}
                  keyboardType="phone-pad"
                  onBlur={() => setTouched(true)}
                  onChangeText={handlePhoneChange}
                  placeholder={t("phonePlaceholder")}
                  textContentType="telephoneNumber"
                  value={phoneDisplay}
                />
                <Text
                  className={
                    showError
                      ? "text-sm leading-snug text-destructive"
                      : "text-sm leading-snug text-muted-foreground"
                  }
                >
                  {helperText}
                </Text>
              </View>

              <Button
                disabled={!canSubmit}
                size="lg"
                variant="brand"
                onPress={handleSubmit}
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
              {t("legalPrefix")}{" "}
              <Text
                className="font-medium text-info-500 underline"
                onPress={() => openLegalPage("terms")}
              >
                {t("terms")}
              </Text>{" "}
              {t("legalAnd")}{" "}
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
  if (error.code === "VALIDATION_FAILED") {
    return t("phoneFormatError");
  }
  if (error.code === "NETWORK_ERROR" || error.status === 0) {
    return t("offline");
  }
  if (error.code === "RATE_LIMITED" || error.status === 429) {
    return t("rateLimitedCode");
  }
  return t("requestFailed");
}
