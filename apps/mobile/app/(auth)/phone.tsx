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

import { PhoneInput } from "../../components/auth/PhoneInput";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { ApiError } from "../../src/api/client";
import { authCopy, type Locale, resolveLocale } from "../../src/auth/copy";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import {
  displayPhoneFromCanonical,
  formatLocalPhone,
  normalizeTmPhone,
  validateTmPhone,
} from "../../src/auth/phone";

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
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [phoneDisplay, setPhoneDisplay] = useState(
    initialPhone ? displayPhoneFromCanonical(initialPhone) : "",
  );
  const [touched, setTouched] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const copy = authCopy[locale];

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
      if (error instanceof ApiError) {
        setRequestError(
          error.code === "VALIDATION_FAILED"
            ? copy.phoneFormatError
            : error.message || copy.requestFailed,
        );
      } else {
        setRequestError(copy.offline);
      }
    }
  }

  function openLegalPage(kind: "terms" | "privacy") {
    void Linking.openURL(`https://auto.tm/${locale}/legal/${kind}`);
  }

  const hasError = !!(requestError || (touched && phoneValidation !== null));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <SafeAreaView className="flex-1 px-5">
        <View className="flex-row items-center justify-between py-4">
          <Button
            accessibilityLabel={copy.close}
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full"
            onPress={closeAuth}
          >
            <Icon as={X} className="size-5 text-foreground" strokeWidth={2} />
          </Button>
          <LocaleSwitcher onChange={setLocale} value={locale} />
        </View>

        <View className="flex-1">
          <View className="mt-6 gap-8">
            <BrandLogo />

            <View className="gap-2">
              <Text className="text-[28px] font-bold leading-snug text-foreground">
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
                hasError={hasError}
                keyboardType="phone-pad"
                onBlur={() => setTouched(true)}
                onChangeText={handlePhoneChange}
                placeholder={copy.phonePlaceholder}
                textContentType="telephoneNumber"
                value={phoneDisplay}
              />
              <Text
                className={
                  hasError
                    ? "text-sm leading-snug text-destructive"
                    : "text-sm leading-snug text-muted-foreground"
                }
              >
                {helperText}
              </Text>
            </View>

            <Button
              disabled={!canSubmit}
              size="xl"
              variant="default"
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text>{copy.getCode}</Text>
              )}
            </Button>
          </View>

          <Text className="mt-auto pb-6 text-xs leading-normal text-muted-foreground">
            {copy.legalPrefix}{" "}
            <Text
              className="font-medium text-foreground underline"
              onPress={() => openLegalPage("terms")}
            >
              {copy.terms}
            </Text>{" "}
            {copy.legalAnd}{" "}
            <Text
              className="font-medium text-foreground underline"
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
