import { AlertCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import {
  getResendCodeErrorCopy,
  getVerifyCodeErrorCopy,
} from "../../src/auth/verifyCodeError";

import { OtpCells, type OtpCellsRef } from "./OtpCells";

import { THEME } from "@/lib/theme";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const OTP_LENGTH = 6;

export interface ResendCodeResult {
  resendInSeconds: number;
  testCode?: string;
}

interface CodeEntryFormProps {
  method: "phone" | "email";
  /** Already masked or formatted for display. */
  displayedDestination: string;
  initialResendSeconds: number;
  initialTestCode?: string;
  /** Resolves when the code is accepted; rejects with the API error otherwise. */
  verify: (code: string) => Promise<void>;
  resend: () => Promise<ResendCodeResult>;
  onChangeDestination: () => void;
}

/**
 * The Sign-in Code entry shared by sign-in and by adding or replacing a
 * Sign-in Method: six cells that submit when full, the resend countdown, and
 * localized error copy. Screens own the chrome and what happens on success.
 */
export function CodeEntryForm({
  method,
  displayedDestination,
  initialResendSeconds,
  initialTestCode,
  verify,
  resend,
  onChangeDestination,
}: CodeEntryFormProps) {
  const otpRef = useRef<OtpCellsRef>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation("auth");

  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState(
    __DEV__ ? initialTestCode : undefined,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(initialResendSeconds);
  const [error, setError] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const lastSubmittedCode = useRef<string | null>(null);

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
    setError(null);
    setCode(value);
  }

  async function submitCode(nextCode: string) {
    if (nextCode.length !== OTP_LENGTH || isVerifying) {
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      await verify(nextCode);
    } catch (verifyError) {
      otpRef.current?.shake();
      setCode("");
      lastSubmittedCode.current = null;

      const copy = getVerifyCodeErrorCopy(verifyError, t, method);
      setError(copy.message);
      setTerminalError(copy.terminal);
      if (!copy.terminal) {
        requestAnimationFrame(() => otpRef.current?.focus());
      }
    } finally {
      setIsVerifying(false);
    }
  }

  async function resendCode() {
    if (secondsRemaining > 0 || isResending) {
      return;
    }

    setError(null);
    setCode("");
    lastSubmittedCode.current = null;
    setIsResending(true);

    try {
      const result = await resend();
      setSecondsRemaining(result.resendInSeconds);
      setTestCode(__DEV__ ? result.testCode : undefined);
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (resendError) {
      setError(getResendCodeErrorCopy(resendError, t));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View className="gap-6">
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
          onPress={onChangeDestination}
        >
          <Text>
            {method === "email" ? t("changeEmail") : t("changeNumber")}
          </Text>
        </Button>
      </View>

      <OtpCells
        ref={otpRef}
        disabled={isVerifying || isResending || terminalError}
        hasError={error !== null}
        length={OTP_LENGTH}
        onChange={handleCodeChange}
        value={code}
      />

      {error ? (
        <View className="flex-row items-center gap-1.5">
          <Icon as={AlertCircle} className="size-4 text-destructive" />
          <Text className="flex-1 text-sm leading-snug text-destructive">
            {error}
          </Text>
        </View>
      ) : null}

      {terminalError ? null : (
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
      )}

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

      {__DEV__ && testCode && !terminalError ? (
        <Button
          className="self-start h-auto rounded-full px-3 py-1"
          size="sm"
          variant="secondary"
          onPress={() => {
            setCode(testCode);
            setError(null);
          }}
        >
          <Text>{t("devCode", { code: testCode })}</Text>
        </Button>
      ) : null}
    </View>
  );
}
