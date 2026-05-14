import { palette } from "@auto-tm/ui/tokens";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthApiError, requestOtp, verifyOtp } from "../../src/auth/client";
import { authCopy, type Locale, resolveLocale } from "../../src/auth/copy";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import { maskTmPhone, normalizeTmPhone } from "../../src/auth/phone";
import { storeAuthSession } from "../../src/auth/session";

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
  router.replace("/(tabs)");
}

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    resendInSeconds?: string;
    testCode?: string;
    locale?: Locale;
  }>();
  const inputRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();

  const phone = firstParam(params.phone);
  const [locale, setLocale] = useState<Locale>(
    resolveLocale(firstParam(params.locale)),
  );
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState(firstParam(params.testCode));
  const [secondsRemaining, setSecondsRemaining] = useState(
    parseInitialSeconds(firstParam(params.resendInSeconds)),
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const lastSubmittedCode = useRef<string | null>(null);
  const copy = authCopy[locale];

  const canonicalPhone = useMemo(
    () => (phone ? normalizeTmPhone(phone) : null),
    [phone],
  );
  const maskedPhone = canonicalPhone ? maskTmPhone(canonicalPhone) : "";
  const iconColor =
    colorScheme === "dark" ? palette.neutral[50] : palette.neutral[900];

  useEffect(() => {
    if (!canonicalPhone) {
      router.replace("/(auth)/phone");
    }
  }, [canonicalPhone]);

  useEffect(() => {
    inputRef.current?.focus();
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

  function runErrorMotion() {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, {
        duration: 50,
        toValue: -8,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 50,
        toValue: 8,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 50,
        toValue: -6,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 50,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtpError(null);
    setCode(digits);
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

  async function submitCode(nextCode: string) {
    if (!canonicalPhone || nextCode.length !== OTP_LENGTH || isVerifying) {
      return;
    }

    setIsVerifying(true);
    setOtpError(null);

    try {
      const result = await verifyOtp({
        phone: canonicalPhone,
        code: nextCode,
        deviceLabel: Platform.OS === "ios" ? "iOS app" : "Android app",
      });

      await storeAuthSession(result);
      router.replace("/(tabs)");
    } catch (error) {
      runErrorMotion();
      setCode("");
      lastSubmittedCode.current = null;
      requestAnimationFrame(() => inputRef.current?.focus());

      if (error instanceof AuthApiError) {
        if (error.code === "INVALID_OTP" || error.code === "OTP_ALREADY_USED") {
          setOtpError(copy.wrongCode);
        } else if (error.code === "OTP_EXPIRED" || error.code === "OTP_NOT_FOUND") {
          setOtpError(copy.expiredCode);
        } else if (error.code === "OTP_LOCKED") {
          setOtpError(copy.lockedCode);
        } else {
          setOtpError(error.message || copy.verifyFailed);
        }
      } else {
        setOtpError(copy.offline);
      }
    } finally {
      setIsVerifying(false);
    }
  }

  async function resendCode() {
    if (!canonicalPhone || secondsRemaining > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setOtpError(null);
    setCode("");
    lastSubmittedCode.current = null;

    try {
      const result = await requestOtp({ phone: canonicalPhone });
      setSecondsRemaining(result.resendInSeconds);
      setTestCode(result.testCode);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      if (error instanceof AuthApiError) {
        setOtpError(error.message || copy.verifyFailed);
      } else {
        setOtpError(copy.offline);
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-neutral-0 dark:bg-neutral-950"
    >
      <SafeAreaView className="flex-1 px-4">
        <View className="flex-row items-center justify-between py-4">
          <View className="flex-row gap-2">
            <Pressable
              accessibilityLabel={copy.back}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-md"
              onPress={backToPhone}
            >
              <ChevronLeft color={iconColor} size={22} />
            </Pressable>
            <Pressable
              accessibilityLabel={copy.close}
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-md"
              onPress={closeAuth}
            >
              <X color={iconColor} size={22} />
            </Pressable>
          </View>
          <LocaleSwitcher onChange={setLocale} value={locale} />
        </View>

        <View className="mt-8 gap-8">
          <BrandLogo />

          <View className="gap-2">
            <Text className="text-2xl font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
              {copy.otpTitle}
            </Text>
            <Text className="text-base leading-normal text-neutral-600 dark:text-neutral-300">
              {copy.otpSent(maskedPhone)}
            </Text>
            <Pressable accessibilityRole="button" onPress={backToPhone}>
              <Text className="text-sm font-medium text-info-500">
                {copy.changeNumber}
              </Text>
            </Pressable>
          </View>

          <Pressable accessibilityRole="button" onPress={() => inputRef.current?.focus()}>
            <Animated.View
              className="flex-row gap-2"
              style={{ transform: [{ translateX: shake }] }}
            >
              {Array.from({ length: OTP_LENGTH }, (_, index) => {
                const digit = code[index];
                const focused = index === code.length && !isVerifying;
                const errored = otpError !== null;

                return (
                  <View
                    className={
                      errored
                        ? "h-12 flex-1 items-center justify-center rounded-md border-2 border-error-500 bg-neutral-0 dark:bg-neutral-900"
                        : focused
                          ? "h-12 flex-1 items-center justify-center rounded-md border-2 border-brand-500 bg-neutral-0 dark:bg-neutral-900"
                          : digit
                            ? "h-12 flex-1 items-center justify-center rounded-md border border-brand-500 bg-neutral-50 dark:bg-neutral-900"
                            : "h-12 flex-1 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                    }
                    key={index}
                    pointerEvents="none"
                  >
                    <Text className="font-mono text-2xl font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                      {digit ?? ""}
                    </Text>
                  </View>
                );
              })}
            </Animated.View>

            <TextInput
              accessibilityLabel={copy.otpTitle}
              autoComplete="sms-otp"
              caretHidden
              className="absolute inset-0"
              contextMenuHidden={false}
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              onChangeText={handleCodeChange}
              ref={inputRef}
              style={styles.hiddenInput}
              textContentType="oneTimeCode"
              value={code}
            />
          </Pressable>

          {otpError ? (
            <Text className="text-sm leading-snug text-error-500">{otpError}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: secondsRemaining > 0 || isResending,
            }}
            disabled={secondsRemaining > 0 || isResending}
            onPress={resendCode}
          >
            <Text
              className={
                secondsRemaining > 0 || isResending
                  ? "text-sm font-medium text-neutral-500 dark:text-neutral-400"
                  : "text-sm font-medium text-info-500"
              }
            >
              {secondsRemaining > 0
                ? copy.resendIn(secondsRemaining)
                : copy.resendCode}
            </Text>
          </Pressable>

          {isVerifying ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color={palette.red[500]} />
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                {copy.loading}
              </Text>
            </View>
          ) : null}

          {isDevBuild() && testCode ? (
            <View className="self-start rounded-md bg-neutral-100 px-3 py-2 dark:bg-neutral-900">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {copy.devCode(testCode)}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    opacity: 0,
  },
});
