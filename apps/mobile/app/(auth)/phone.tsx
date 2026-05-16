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
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";


import { PhoneInput } from "../../components/auth/PhoneInput";
import { AuthApiError, requestOtp } from "../../src/auth/client";
import { authCopy, type Locale, resolveLocale } from "../../src/auth/copy";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import {
  displayPhoneFromCanonical,
  formatLocalPhone,
  normalizeTmPhone,
  validateTmPhone,
} from "../../src/auth/phone";

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
    locale?: Locale;
  }>();
  const initialLocale = resolveLocale(firstParam(params.locale));
  const initialPhone = firstParam(params.phone);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [phoneDisplay, setPhoneDisplay] = useState(
    initialPhone ? displayPhoneFromCanonical(initialPhone) : "",
  );
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const copy = authCopy[locale];

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
      return copy.phoneInputHelper;
    }

    return phoneValidation === "incomplete"
      ? copy.phoneIncompleteError
      : copy.phoneFormatError;
  }, [copy, phoneValidation, requestError, touched]);

  function handlePhoneChange(value: string) {
    setPhoneDisplay(formatLocalPhone(value));
    setRequestError(null);
  }

  async function handleSubmit() {
    setTouched(true);

    if (!canonicalPhone || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const result = await requestOtp({ phone: canonicalPhone });

      router.push({
        pathname: "/(auth)/otp",
        params: {
          phone: canonicalPhone,
          requestId: result.requestId,
          resendInSeconds: String(result.resendInSeconds),
          locale,
          ...(result.testCode ? { testCode: result.testCode } : {}),
        },
      });
    } catch (error) {
      if (error instanceof AuthApiError) {
        setRequestError(
          error.code === "VALIDATION_FAILED"
            ? copy.phoneFormatError
            : error.message || copy.requestFailed,
        );
      } else {
        setRequestError(copy.offline);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function openLegalPage(kind: "terms" | "privacy") {
    void Linking.openURL(`https://auto.tm/${locale}/legal/${kind}`);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <SafeAreaView className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <Button
            accessibilityLabel={copy.close}
            size="icon"
            variant="ghost"
            onPress={closeAuth}
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
          <LocaleSwitcher onChange={setLocale} value={locale} />
        </View>

        <View className="flex-1">
          <View className="mt-8 gap-8">
            <BrandLogo />

            <View className="gap-2">
              <Text className="text-2xl font-semibold leading-snug text-foreground">
                {copy.phoneTitle}
              </Text>
              <Text className="text-base leading-normal text-muted-foreground">
                {copy.phoneHelper}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                {copy.phoneLabel}
              </Text>
              <PhoneInput
                accessibilityLabel={copy.phoneLabel}
                hasError={!!(requestError || (touched && phoneValidation !== null))}
                keyboardType="phone-pad"
                onBlur={() => setTouched(true)}
                onChangeText={handlePhoneChange}
                placeholder={copy.phonePlaceholder}
                textContentType="telephoneNumber"
                value={phoneDisplay}
              />
              <Text
                className={
                  requestError || (touched && phoneValidation !== null)
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
              variant="default"
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color={`hsl(${THEME[isDark ? "dark" : "light"].primaryForeground})`}
                />
              ) : (
                <Text>{copy.getCode}</Text>
              )}
            </Button>
          </View>

          <Text className="mt-auto pb-6 text-xs leading-normal text-muted-foreground">
            {copy.legalPrefix}{" "}
            <Text
              className="font-medium text-info-500 underline"
              onPress={() => openLegalPage("terms")}
            >
              {copy.terms}
            </Text>{" "}
            {copy.legalAnd}{" "}
            <Text
              className="font-medium text-info-500 underline"
              onPress={() => openLegalPage("privacy")}
            >
              {copy.privacy}
            </Text>
            .
          </Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
