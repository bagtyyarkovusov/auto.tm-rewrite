import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  X,
} from "lucide-react-native";

import { useAuth } from "../../auth/useAuth";
import { useAuthIntentStore } from "../../auth/intentStore";
import { useCreateInspectionInterest } from "../../api/reports/useCreateInspectionInterest";
import { mapErrorToCopy } from "../../api/getErrorCopy";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface InspectionInterestCtaProps {
  listingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}

export function InspectionInterestCta({
  listingId,
  open,
  onOpenChange,
  disabled = false,
}: InspectionInterestCtaProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const createInterest = useCreateInspectionInterest();

  const [wtpText, setWtpText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const parsedWtp = parseWillingnessToPay(wtpText);
  const hasInputError = validationError !== null;
  const isInvalidWtp = parsedWtp.kind === "invalid";

  const handleOpen = () => {
    if (disabled) return;
    onOpenChange(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after the sheet close animation so the reset is not visible.
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      setWtpText("");
      setSubmitted(false);
      setValidationError(null);
      createInterest.reset();
      resetTimeoutRef.current = null;
    }, 300);
  };

  const handleWtpChange = (value: string) => {
    // Strip everything except digits so the number-pad cannot produce
    // invalid strings, but still guard against paste.
    const digitsOnly = value.replace(/\D/g, "");
    setWtpText(digitsOnly);
    setValidationError(null);
  };

  const handleAnonymousContinue = () => {
    useAuthIntentStore.getState().setIntent({
      returnPath: `/(public)/listings/${listingId}`,
      replay: async () => onOpenChange(true),
    });
    onOpenChange(false);
    router.push("/(auth)/phone");
  };

  const handleSubmit = () => {
    if (isInvalidWtp) {
      setValidationError(t("willingnessToPayInvalid"));
      return;
    }

    createInterest.mutate(
      {
        listingId,
        willingnessToPayTmt:
          parsedWtp.kind === "empty" ? undefined : parsedWtp.value,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      },
    );
  };

  const errorCopy = createInterest.error
    ? mapErrorToCopy(createInterest.error, t)
    : null;

  return (
    <>
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className={cn(
          "min-h-[44px] rounded-xl border border-border p-4",
          disabled
            ? "bg-muted opacity-70"
            : "bg-card active:bg-muted",
        )}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-info-500/10">
            <Icon as={ClipboardCheck} className="size-5 text-info-500" />
          </View>
          <View className="flex-1">
            <Text className={cn("text-base font-medium", disabled ? "text-muted-foreground" : "text-foreground")}>
              {t("requestInspection")}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {disabled ? t("inspectionInterestUnavailable") : t("inspectionInterestHint")}
            </Text>
          </View>
          <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
        </View>
      </Pressable>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent compact>
          <SheetHeader>
            <View className="flex-row items-center justify-between">
              <SheetTitle>{t("requestInspection")}</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <Icon as={X} className="size-5 text-foreground" />
                </Button>
              </SheetClose>
            </View>
            <SheetDescription>
              {submitted ? t("inspectionInterestReceived") : t("inspectionInterestDescription")}
            </SheetDescription>
          </SheetHeader>

          {submitted ? (
            <View className="items-center gap-4 py-6">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-success-500/10">
                <Icon as={Check} className="size-6 text-success-500" />
              </View>
              <Text className="text-center text-base text-foreground">
                {t("inspectionInterestReceived")}
              </Text>
              <Button variant="default" className="w-full" onPress={handleClose}>
                <Text>{t("done")}</Text>
              </Button>
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  {t("willingnessToPayPrompt")}
                </Text>
                <Input
                  keyboardType="number-pad"
                  placeholder={t("willingnessToPayPlaceholder")}
                  value={wtpText}
                  onChangeText={handleWtpChange}
                  maxLength={5}
                  editable={!createInterest.isPending}
                />
                <Text className="text-xs text-muted-foreground">
                  {t("willingnessToPayOptional")}
                </Text>
                {(hasInputError || isInvalidWtp) && (
                  <View className="flex-row items-center gap-1.5">
                    <Icon as={CircleAlert} className="size-4 text-destructive" />
                    <Text className="text-sm text-destructive">
                      {validationError ?? t("willingnessToPayInvalid")}
                    </Text>
                  </View>
                )}
              </View>

              {errorCopy && (
                <View className="rounded-lg bg-destructive/10 p-3">
                  <Text className="text-sm font-medium text-destructive">
                    {errorCopy.title}
                  </Text>
                  <Text className="text-sm text-destructive/80">
                    {errorCopy.description}
                  </Text>
                </View>
              )}

              {isAuthenticated === false ? (
                <Button variant="default" className="w-full" onPress={handleAnonymousContinue}>
                  <Text>{t("continueWithPhone")}</Text>
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  disabled={createInterest.isPending}
                  onPress={handleSubmit}
                >
                  <Text>
                    {createInterest.isPending ? t("submitting") : t("submitInterest")}
                  </Text>
                </Button>
              )}
            </View>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

type WtpParseResult =
  | { kind: "empty" }
  | { kind: "value"; value: number }
  | { kind: "invalid" };

function parseWillingnessToPay(text: string): WtpParseResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { kind: "empty" };
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    return { kind: "invalid" };
  }
  return { kind: "value", value };
}
