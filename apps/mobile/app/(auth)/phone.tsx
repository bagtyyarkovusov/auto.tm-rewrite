import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { AuthEntryScreen } from "../../components/auth/AuthEntryScreen";
import { PhoneInput } from "../../components/auth/PhoneInput";
import { ApiError } from "../../src/api/client";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { useAuthIntentStore } from "../../src/auth/intentStore";
import {
  displayPhoneFromCanonical,
  formatLocalPhone,
  normalizeTmPhone,
  validateTmPhone,
} from "../../src/auth/phone";
import { getRequestOtpErrorCopy } from "../../src/auth/requestOtpError";

import { Text } from "@/components/ui/text";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function PhoneScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    authRoot?: string;
  }>();
  const initialPhone = firstParam(params.phone);
  const isAuthRoot = firstParam(params.authRoot) === "1";
  const { t } = useTranslation("auth");

  const [phoneDisplay, setPhoneDisplay] = useState(
    initialPhone ? displayPhoneFromCanonical(initialPhone) : "",
  );
  const [touched, setTouched] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const { mutateAsync: requestOtp, isPending: isSubmitting } = useRequestOtp();

  // The route that started authentication owns abandoned-flow cleanup. A
  // sibling method screen can sit above it without cancelling the intent.
  useEffect(() => {
    if (!isAuthRoot) return;

    return () => {
      useAuthIntentStore.getState().cancelSignIn();
    };
  }, [isAuthRoot]);

  const canonicalPhone = useMemo(
    () => normalizeTmPhone(phoneDisplay),
    [phoneDisplay],
  );
  const phoneValidation = validateTmPhone(phoneDisplay);
  const canSubmit = canonicalPhone !== null && !isSubmitting;

  const helperText = useMemo(() => {
    if (requestError) return requestError;
    if (!touched || phoneValidation === null) return t("phoneInputHelper");

    return phoneValidation === "incomplete"
      ? t("phoneIncompleteError")
      : t("phoneFormatError");
  }, [t, phoneValidation, requestError, touched]);

  const showError = useMemo(() => {
    if (requestError) return true;
    if (!touched) return false;
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

    if (!canonicalPhone || isSubmitting) return;

    setRequestError(null);

    try {
      const result = await requestOtp({ phone: canonicalPhone });

      router.push({
        pathname: "/(auth)/otp",
        params: {
          method: "phone",
          destination: canonicalPhone,
          requestId: result.requestId,
          resendInSeconds: String(result.resendInSeconds),
          ...(__DEV__ && result.testCode ? { testCode: result.testCode } : {}),
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setRequestError(getRequestOtpErrorCopy(error, t, "phoneFormatError"));
      } else {
        setRequestError(t("offline"));
      }
    }
  }

  return (
    <AuthEntryScreen
      canSubmit={canSubmit}
      helper={t("phoneHelper")}
      isSubmitting={isSubmitting}
      method="phone"
      title={t("phoneTitle")}
      onSubmit={handleSubmit}
    >
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
    </AuthEntryScreen>
  );
}
