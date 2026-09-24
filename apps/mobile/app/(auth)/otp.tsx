import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, ChevronLeft } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import type { AuthSchemas } from "@auto-tm/contracts";

import { OtpCells, type OtpCellsRef } from "../../components/auth/OtpCells";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { useVerifyOtp } from "../../src/api/identity/useVerifyOtp";
import { ApiError } from "../../src/api/client";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import { normalizeEmail } from "../../src/auth/email";
import { maskTmPhone, normalizeTmPhone } from "../../src/auth/phone";
import { storeAuthSession } from "../../src/auth/session";
import { useOtpAuthNavigation } from "../../src/auth/useOtpAuthNavigation";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { THEME } from "@/lib/theme";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const OTP_LENGTH = 6;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseInitialSeconds(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    method?: string;
    destination?: string;
    resendInSeconds?: string;
    testCode?: string;
  }>();
  const otpRef = useRef<OtpCellsRef>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, i18n } = useTranslation("auth");
  const authNavigation = useOtpAuthNavigation(router);

  const method = firstParam(params.method);
  const destination = firstParam(params.destination);
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState(
    __DEV__ ? firstParam(params.testCode) : undefined,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(
    parseInitialSeconds(firstParam(params.resendInSeconds)),
  );
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreDate, setRestoreDate] = useState<string | null>(null);
  const [pendingSession, setPendingSession] =
    useState<AuthSchemas.OtpVerifyResponse | null>(null);
  const lastSubmittedCode = useRef<string | null>(null);

  const { mutateAsync: verifyOtpMutate, isPending: isVerifying } =
    useVerifyOtp();
  const { mutateAsync: requestOtpMutate, isPending: isResending } =
    useRequestOtp();

  const canonicalDestination = useMemo(() => {
    if (!destination) return null;
    if (method === "phone") return normalizeTmPhone(destination);
    if (method === "email") return normalizeEmail(destination);
    return null;
  }, [destination, method]);
  const displayedDestination =
    method === "phone" && canonicalDestination
      ? maskTmPhone(canonicalDestination)
      : (canonicalDestination ?? "");

  useEffect(() => {
    if (!canonicalDestination || (method !== "phone" && method !== "email")) {
      authNavigation.invalidDestination(method === "email" ? "email" : "phone");
    }
  }, [canonicalDestination, method]);

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

  function cancelAuth() {
    authNavigation.cancel();
  }

  function changeSignInMethod() {
    authNavigation.changeMethod();
  }

  async function submitCode(nextCode: string) {
    if (!canonicalDestination || nextCode.length !== OTP_LENGTH || isVerifying) {
      return;
    }

    setOtpError(null);

    try {
      const identifier =
        method === "email"
          ? { email: canonicalDestination }
          : { phone: canonicalDestination };
      const result = await verifyOtpMutate({
        ...identifier,
        code: nextCode,
        deviceLabel: Platform.OS === "ios" ? "iOS app" : "Android app",
      });

      if (result.user.deletionScheduledAt) {
        setPendingSession(result);
        setRestoreDate(
          new Intl.DateTimeFormat(i18n.language ?? "ru", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(result.user.deletionScheduledAt)),
        );
        setShowRestorePrompt(true);
        return;
      }

      await storeAuthSession(result);
      authNavigation.complete();
    } catch (error) {
      otpRef.current?.shake();
      setCode("");
      lastSubmittedCode.current = null;
      requestAnimationFrame(() => otpRef.current?.focus());

      if (error instanceof ApiError) {
        if (error.code === "INVALID_OTP") {
          setOtpError(t("wrongCode"));
        } else if (error.code === "OTP_ALREADY_USED") {
          setOtpError(t("usedCode"));
        } else if (error.code === "OTP_EXPIRED" || error.code === "OTP_NOT_FOUND") {
          setOtpError(t("expiredCode"));
        } else if (error.code === "OTP_LOCKED") {
          setOtpError(t("lockedCode"));
        } else if (error.code === "RATE_LIMITED" || error.status === 429) {
          setOtpError(t("rateLimitedCode"));
        } else {
          setOtpError(error.message || t("verifyFailed"));
        }
      } else {
        setOtpError(t("offline"));
      }
    }
  }

  async function resendCode() {
    if (!canonicalDestination || secondsRemaining > 0 || isResending) {
      return;
    }

    setOtpError(null);
    setCode("");
    lastSubmittedCode.current = null;

    try {
      const result = await requestOtpMutate(
        method === "email"
          ? { email: canonicalDestination }
          : { phone: canonicalDestination },
      );
      setSecondsRemaining(result.resendInSeconds);
      setTestCode(__DEV__ ? result.testCode : undefined);
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "NETWORK_ERROR" || error.status === 0) {
          setOtpError(t("offline"));
        } else if (error.code === "RATE_LIMITED" || error.status === 429) {
          setOtpError(t("rateLimitedCode"));
        } else {
          setOtpError(t("verifyFailed"));
        }
      } else {
        setOtpError(t("offline"));
      }
    }
  }

  async function handleRestoreConfirm() {
    if (!pendingSession) {
      setShowRestorePrompt(false);
      return;
    }
    try {
      await storeAuthSession(pendingSession);
      setPendingSession(null);
      setShowRestorePrompt(false);
      authNavigation.complete();
    } catch {
      // Keep prompt open so the user can retry if storage fails.
    }
  }

  function handleRestoreCancel() {
    setShowRestorePrompt(false);
    setPendingSession(null);
    setCode("");
    lastSubmittedCode.current = null;
    changeSignInMethod();
  }

  return (
    <>
      <SafeScreen>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-1 px-4">
            <View className="flex-row items-center justify-between py-4">
              <Button
                accessibilityLabel={t("back")}
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                onPress={cancelAuth}
              >
                <Icon as={ChevronLeft} className="size-5 text-foreground" />
              </Button>
              <LocaleSwitcher />
            </View>

            <View className="mt-6 gap-6">
              <BrandLogo />

              <View className="gap-2">
                <Text className="text-2xl font-semibold leading-snug text-foreground">
                  {t("otpTitle")}
                </Text>
                <Text className="text-base leading-normal text-muted-foreground">
                  {t("otpSent", { destination: displayedDestination })}
                </Text>
                {method === "email" ? (
                  <Text className="text-sm leading-normal text-muted-foreground">
                    {t("emailCodeExpiry")}
                  </Text>
                ) : null}
                <Button
                  variant="link"
                  className="self-start px-0"
                  onPress={changeSignInMethod}
                >
                  <Text>
                    {method === "email" ? t("changeEmail") : t("changeNumber")}
                  </Text>
                </Button>
              </View>

              <OtpCells
                ref={otpRef}
                disabled={isVerifying || isResending}
                hasError={otpError !== null}
                length={OTP_LENGTH}
                onChange={handleCodeChange}
                value={code}
              />

              {otpError ? (
                <View className="flex-row items-center gap-1.5">
                  <Icon as={AlertCircle} className="size-4 text-destructive" />
                  <Text className="text-sm leading-snug text-destructive">
                    {otpError}
                  </Text>
                </View>
              ) : null}

              <Button
                disabled={secondsRemaining > 0 || isResending}
                variant="link"
                className="self-start px-0"
                onPress={resendCode}
              >
                <Text className={secondsRemaining > 0 || isResending ? "text-muted-foreground" : "text-foreground underline"}>
                  {secondsRemaining > 0
                    ? t("resendIn", { seconds: secondsRemaining })
                    : isResending
                      ? t("loading")
                      : t("resendCode")}
                </Text>
              </Button>

              {isVerifying ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator
                    color={`hsl(${THEME[isDark ? "dark" : "light"].primary})`}
                  />
                  <Text className="text-sm text-muted-foreground">
                    {t("loading")}
                  </Text>
                </View>
              ) : null}

              {__DEV__ && testCode ? (
                <Button
                  className="self-start h-auto rounded-full px-3 py-1"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setCode(testCode);
                    setOtpError(null);
                  }}
                >
                  <Text>{t("devCode", { code: testCode })}</Text>
                </Button>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeScreen>

      {/* Account restoration prompt during deletion grace */}
      <AlertDialog open={showRestorePrompt} onOpenChange={setShowRestorePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("restoreAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("restoreAccountMessage", { date: restoreDate ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={handleRestoreCancel}>
              <Text>{t("restoreAccountCancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleRestoreConfirm}>
              <Text>{t("restoreAccountConfirm")}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
