import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { AuthSchemas } from "@auto-tm/contracts";

import { CodeEntryForm } from "../../components/auth/CodeEntryForm";
import { useRequestOtp } from "../../src/api/identity/useRequestOtp";
import { useVerifyOtp } from "../../src/api/identity/useVerifyOtp";
import { BrandLogo } from "../../src/auth/BrandLogo";
import { LocaleSwitcher } from "../../src/auth/LocaleSwitcher";
import { normalizeEmail } from "../../src/auth/email";
import { maskTmPhone, normalizeTmPhone } from "../../src/auth/phone";
import { storeAuthSession } from "../../src/auth/session";
import { useOtpAuthNavigation } from "../../src/auth/useOtpAuthNavigation";

import { SafeScreen } from "@/components/navigation/SafeScreen";
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
  const { t, i18n } = useTranslation("auth");
  const authNavigation = useOtpAuthNavigation(router);

  const method = firstParam(params.method);
  const destination = firstParam(params.destination);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [restoreDate, setRestoreDate] = useState<string | null>(null);
  const [pendingSession, setPendingSession] =
    useState<AuthSchemas.OtpVerifyResponse | null>(null);

  const { mutateAsync: verifyOtpMutate } = useVerifyOtp();
  const { mutateAsync: requestOtpMutate } = useRequestOtp();

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
  const identifier = canonicalDestination
    ? method === "email"
      ? { email: canonicalDestination }
      : { phone: canonicalDestination }
    : null;

  useEffect(() => {
    if (!canonicalDestination || (method !== "phone" && method !== "email")) {
      authNavigation.invalidDestination(method === "email" ? "email" : "phone");
    }
  }, [canonicalDestination, method]);

  function cancelAuth() {
    authNavigation.cancel();
  }

  function changeSignInMethod() {
    authNavigation.changeMethod();
  }

  async function verifyCode(code: string) {
    if (!identifier) return;

    const result = await verifyOtpMutate({
      ...identifier,
      code,
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
  }

  async function resendCode() {
    if (!identifier) throw new Error("Missing Sign-in Method");

    return requestOtpMutate(identifier);
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

              <CodeEntryForm
                method={method === "email" ? "email" : "phone"}
                displayedDestination={displayedDestination}
                initialResendSeconds={parseInitialSeconds(
                  firstParam(params.resendInSeconds),
                )}
                initialTestCode={firstParam(params.testCode)}
                verify={verifyCode}
                resend={resendCode}
                onChangeDestination={changeSignInMethod}
              />
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
