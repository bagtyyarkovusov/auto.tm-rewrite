import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, ChevronLeft, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OtpCells, type OtpCellsRef } from "../../components/auth/OtpCells";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { useVerifyOtp } from "../../src/api/identity/useVerifyOtp";
import { ApiError } from "../../src/api/client";
import { authCopy, type Locale, resolveLocale } from "../../src/auth/copy";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import { maskTmPhone, normalizeTmPhone } from "../../src/auth/phone";
import { storeAuthSession } from "../../src/auth/session";
import { useAuthIntentStore } from "../../src/auth/intentStore";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const OTP_LENGTH = 6;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseInitialSeconds(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function isDevBuild(): boolean {
  return process.env.EXPO_PUBLIC_ENV !== "production";
}

function closeAuth() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
}

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    resendInSeconds?: string;
    testCode?: string;
    locale?: Locale;
  }>();
  const otpRef = useRef<OtpCellsRef>(null);

  const phone = firstParam(params.phone);
  const [locale, setLocale] = useState<Locale>(
    resolveLocale(firstParam(params.locale)),
  );
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState(firstParam(params.testCode));
  const [secondsRemaining, setSecondsRemaining] = useState(
    parseInitialSeconds(firstParam(params.resendInSeconds)),
  );
  const [otpError, setOtpError] = useState<string | null>(null);
  const lastSubmittedCode = useRef<string | null>(null);
  const copy = authCopy[locale];

  const { mutateAsync: verifyOtpMutate, isPending: isVerifying } =
    useVerifyOtp();
  const { mutateAsync: requestOtpMutate, isPending: isResending } =
    useRequestOtp();

  const canonicalPhone = useMemo(
    () => (phone ? normalizeTmPhone(phone) : null),
    [phone],
  );
  const maskedPhone = canonicalPhone ? maskTmPhone(canonicalPhone) : "";

  useEffect(() => {
    if (!canonicalPhone) {
      router.replace("/(auth)/phone");
    }
  }, [canonicalPhone]);

  useEffect(() => {
    otpRef.current?.focus();
  }, []);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  useEffect(() => {
    if (
      code.length === OTP_LENGTH &&
      !isVerifying &&
      lastSubmittedCode.current !== code
    ) {
      lastSubmittedCode.current = code;
      void submitCode(code);
    }
  }, [code, isVerifying]);

  function handleCodeChange(value: string) {
    setOtpError(null);
    setCode(value);
  }

  function backToPhone() {
    router.replace({
      pathname: "/(auth)/phone",
      params: {
        ...(canonicalPhone ? { phone: canonicalPhone } : {}),
        locale,
      },
    });
  }

  function getOtpErrorMessage(error: ApiError): string {
    switch (error.code) {
      case "INVALID_OTP":
        return copy.wrongCode;
      case "OTP_ALREADY_USED":
        return copy.usedCode;
      case "OTP_EXPIRED":
      case "OTP_NOT_FOUND":
        return copy.expiredCode;
      case "OTP_LOCKED":
        return copy.lockedCode;
      case "RATE_LIMITED":
        return copy.rateLimitedCode;
      default:
        return error.message || copy.genericCode;
    }
  }

  async function submitCode(nextCode: string) {
    if (!canonicalPhone || nextCode.length !== OTP_LENGTH || isVerifying) {
      return;
    }

    setOtpError(null);

    try {
      const result = await verifyOtpMutate({
        phone: canonicalPhone,
        code: nextCode,
        deviceLabel: Platform.OS === "ios" ? "iOS app" : "Android app",
      });

      await storeAuthSession(result);
      router.dismissAll();
      await useAuthIntentStore
        .getState()
        .consumeAndReplay(router as { replace: (path: string) => void });
    } catch (error) {
      otpRef.current?.shake();
      setCode("");
      lastSubmittedCode.current = null;
      requestAnimationFrame(() => otpRef.current?.focus());

      if (error instanceof ApiError) {
        setOtpError(getOtpErrorMessage(error));
      } else {
        setOtpError(copy.offline);
      }
    }
  }

  async function resendCode() {
    if (!canonicalPhone || secondsRemaining > 0 || isResending) {
      return;
    }

    setOtpError(null);
    setCode("");
    lastSubmittedCode.current = null;

    try {
      const result = await requestOtpMutate({ phone: canonicalPhone });
      setSecondsRemaining(result.resendInSeconds);
      setTestCode(result.testCode);
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (error) {
      if (error instanceof ApiError) {
        setOtpError(error.message || copy.verifyFailed);
      } else {
        setOtpError(copy.offline);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <SafeAreaView className="flex-1 px-5">
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row items-center gap-1">
            <Button
              accessibilityLabel={copy.back}
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full"
              onPress={backToPhone}
            >
              <Icon
                as={ChevronLeft}
                className="size-5 text-foreground"
                strokeWidth={2}
              />
            </Button>
            <Button
              accessibilityLabel={copy.close}
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full"
              onPress={closeAuth}
            >
              <Icon as={X} className="size-5 text-foreground" strokeWidth={2} />
            </Button>
          </View>
          <LocaleSwitcher onChange={setLocale} value={locale} />
        </View>

        <View className="mt-6 gap-6">
          <BrandLogo />

          <View className="gap-2">
            <Text className="text-[28px] font-bold leading-snug text-foreground">
              {copy.otpTitle}
            </Text>
            <Text className="text-base leading-normal text-muted-foreground">
              {copy.otpSent(maskedPhone)}
            </Text>
            <Button
              variant="link"
              className="self-start px-0 h-auto"
              onPress={backToPhone}
            >
              <Text className="text-sm font-medium text-foreground underline">
                {copy.changeNumber}
              </Text>
            </Button>
          </View>

          <OtpCells
            ref={otpRef}
            hasError={otpError !== null}
            length={OTP_LENGTH}
            onChange={handleCodeChange}
            value={code}
            disabled={isVerifying}
          />

          {otpError ? (
            <View className="flex-row items-center gap-1.5">
              <Icon as={AlertCircle} className="size-4 text-destructive" />
              <Text className="text-sm font-medium leading-snug text-destructive">
                {otpError}
              </Text>
            </View>
          ) : null}

          <Button
            disabled={secondsRemaining > 0 || isResending}
            variant="link"
            className="self-start px-0 h-auto"
            onPress={resendCode}
          >
            <Text className="text-sm font-medium text-foreground underline">
              {secondsRemaining > 0
                ? copy.resendIn(secondsRemaining)
                : copy.resendCode}
            </Text>
          </Button>

          {isVerifying ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="black" />
              <Text className="text-sm text-muted-foreground">
                {copy.loading}
              </Text>
            </View>
          ) : null}

          {isDevBuild() && testCode ? (
            <Button
              className="self-start h-auto rounded-full px-3.5 py-1.5 border-[1.5px] border-foreground bg-background"
              size="sm"
              variant="ghost"
              onPress={() => {
                setCode(testCode);
                setOtpError(null);
              }}
            >
              <Text className="text-sm font-medium text-foreground">
                {copy.devCode(testCode)}
              </Text>
            </Button>
          ) : null}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
