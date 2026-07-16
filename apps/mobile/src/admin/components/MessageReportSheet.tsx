import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react-native";
import type { AdminSchemas } from "@auto-tm/contracts";

import { useAuth } from "../../auth/useAuth";
import { useAuthIntentStore } from "../../auth/intentStore";
import { useCreateMessageReport } from "../../api/admin/useCreateMessageReport";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

function useReasonLabels() {
  const { t } = useTranslation();
  const labels: Record<
    AdminSchemas.CreateMessageReportRequest["reason"],
    string
  > = {
    spam: t("spam"),
    scam: t("scam"),
    misleading: t("misleading"),
    harassment: t("harassment"),
    other: t("other"),
  };
  return labels;
}

const MESSAGE_REASONS: AdminSchemas.CreateMessageReportRequest["reason"][] = [
  "spam",
  "scam",
  "misleading",
  "harassment",
  "other",
];

interface MessageReportSheetProps {
  conversationId: string;
  messageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported?: (messageId: string) => void;
}

export function MessageReportSheet({
  conversationId,
  messageId,
  open,
  onOpenChange,
  onReported,
}: MessageReportSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const createReport = useCreateMessageReport();
  const REASON_LABELS = useReasonLabels();

  const [reason, setReason] = useState<
    AdminSchemas.CreateMessageReportRequest["reason"] | null
  >(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSelectReason = (
    r: AdminSchemas.CreateMessageReportRequest["reason"],
  ) => {
    setReason(r);
    if (r !== "other") {
      setDetails("");
    }
  };

  const handleSubmit = () => {
    if (!reason) return;

    if (isAuthenticated === false) {
      useAuthIntentStore.getState().setIntent({
        returnPath: `/conversations/${conversationId}`,
      });
      router.push("/(auth)/phone");
      return;
    }

    if (isAuthenticated !== true) {
      return;
    }

    createReport.mutate(
      {
        conversationId,
        messageId,
        reason,
        ...(reason === "other" ? { details } : {}),
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          onReported?.(messageId);
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setReason(null);
      setDetails("");
      setSubmitted(false);
      createReport.reset();
    }, 300);
  };

  const showDetailsInput = reason === "other";
  const canSubmit =
    reason != null && (reason !== "other" || details.trim().length > 0);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent compact>
        <SheetHeader>
          <View className="flex-row items-center justify-between">
            <SheetTitle>{t("report")}</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <Icon as={X} className="size-5 text-foreground" />
              </Button>
            </SheetClose>
          </View>
          <SheetDescription>
            {submitted ? t("thanksWeReceived") : t("selectReason")}
          </SheetDescription>
        </SheetHeader>

        {submitted ? (
          <View className="items-center gap-4 py-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-success-500/10">
              <Icon as={Check} className="size-6 text-success-500" />
            </View>
            <Text className="text-center text-base text-foreground">
              {t("thanksWeReceived")}
            </Text>
            <Button variant="default" className="w-full" onPress={handleClose}>
              <Text>{t("done")}</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-4">
            <View className="gap-1">
              {MESSAGE_REASONS.map((r) => {
                const selected = reason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => handleSelectReason(r)}
                    className={cn(
                      "flex-row items-center justify-between rounded-lg px-4 py-3",
                      selected ? "bg-primary/10" : "bg-card active:bg-muted",
                    )}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      className={cn(
                        "text-base",
                        selected ? "font-medium text-primary" : "text-foreground",
                      )}
                    >
                      {REASON_LABELS[r]}
                    </Text>
                    {selected && (
                      <Icon as={Check} className="size-5 text-primary" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {showDetailsInput && (
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">
                  {t("pleaseProvideDetails")}
                </Text>
                <Input
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="h-24 py-2"
                  placeholder={t("describeIssue")}
                  value={details}
                  onChangeText={setDetails}
                  maxLength={1000}
                />
                <Text className="text-right text-xs text-muted-foreground">
                  {details.length}/1000
                </Text>
              </View>
            )}

            {createReport.isError && (
              <Text className="text-center text-sm text-destructive">
                {getErrorCopy(createReport.error, t)}
              </Text>
            )}

            <Button
              variant="default"
              className="w-full"
              disabled={!canSubmit || createReport.isPending}
              onPress={handleSubmit}
            >
              <Text>
                {createReport.isPending ? t("submitting") : t("submitReport")}
              </Text>
            </Button>
          </View>
        )}
      </SheetContent>
    </Sheet>
  );
}

function getErrorCopy(error: unknown, t: (key: string) => string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: { reason?: string } }).details?.reason ===
      "SELF_REPORT_NOT_ALLOWED"
  ) {
    return t("itemNoLongerAvailable");
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: { reason?: string } }).details?.reason ===
      "USER_SUSPENDED"
  ) {
    return t("accountRestricted");
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: { reason?: string } }).details?.reason ===
      "FEATURE_DISABLED"
  ) {
    return t("featureUnavailable");
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 404
  ) {
    return t("itemNoLongerAvailable");
  }

  return t("somethingWentWrong");
}
