import { palette } from "@auto-tm/ui/tokens";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const colorScheme = useColorScheme();

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
  const iconColor =
    colorScheme === "dark" ? palette.neutral[50] : palette.neutral[900];

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
      className="flex-1 bg-neutral-0 dark:bg-neutral-950"
    >
      <SafeAreaView className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <Pressable
            accessibilityLabel={copy.close}
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-md"
            onPress={closeAuth}
          >
            <X color={iconColor} size={22} />
          </Pressable>
          <LocaleSwitcher onChange={setLocale} value={locale} />
        </View>

        <View className="flex-1">
          <View className="mt-8 gap-8">
            <BrandLogo />

            <View className="gap-2">
              <Text className="text-2xl font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                {copy.phoneTitle}
              </Text>
              <Text className="text-base leading-normal text-neutral-600 dark:text-neutral-300">
                {copy.phoneHelper}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {copy.phoneLabel}
              </Text>
              <View
                className={
                  requestError || (touched && phoneValidation !== null)
                    ? "h-12 flex-row items-center rounded-md border-2 border-error-500 bg-neutral-0 dark:bg-neutral-900"
                    : "h-12 flex-row items-center rounded-md border border-neutral-200 bg-neutral-0 dark:border-neutral-700 dark:bg-neutral-900"
                }
              >
                <View className="h-full justify-center border-r border-neutral-200 px-3 dark:border-neutral-700">
                  <Text className="text-base text-neutral-900 dark:text-neutral-50">
                    +993
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={copy.phoneLabel}
                  className="min-w-0 flex-1 px-3 text-base text-neutral-900 dark:text-neutral-50"
                  keyboardType="phone-pad"
                  onBlur={() => setTouched(true)}
                  onChangeText={handlePhoneChange}
                  placeholder={copy.phonePlaceholder}
                  placeholderTextColor={palette.neutral[400]}
                  returnKeyType="done"
                  textContentType="telephoneNumber"
                  value={phoneDisplay}
                />
              </View>
              <Text
                className={
                  requestError || (touched && phoneValidation !== null)
                    ? "text-sm leading-snug text-error-500"
                    : "text-sm leading-snug text-neutral-500 dark:text-neutral-400"
                }
              >
                {helperText}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              className={
                canSubmit
                  ? "h-12 items-center justify-center rounded-md bg-brand-500"
                  : "h-12 items-center justify-center rounded-md bg-brand-500 opacity-50"
              }
              disabled={!canSubmit}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color={palette.neutral[0]} />
              ) : (
                <Text className="text-base font-medium leading-tight text-neutral-0">
                  {copy.getCode}
                </Text>
              )}
            </Pressable>
          </View>

          <Text className="mt-auto pb-6 text-xs leading-normal text-neutral-500 dark:text-neutral-400">
            {copy.legalPrefix}{" "}
            <Text
              accessibilityRole="link"
              className="font-medium text-info-500 underline"
              onPress={() => openLegalPage("terms")}
            >
              {copy.terms}
            </Text>{" "}
            {copy.legalAnd}{" "}
            <Text
              accessibilityRole="link"
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
