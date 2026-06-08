import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import type { AdminSchemas } from "@auto-tm/contracts";

import { useAuth } from "../../auth/useAuth";
import { useAuthIntentStore } from "../../auth/intentStore";
import { useCreateReport } from "../../api/admin/useCreateReport";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

const REASON_LABELS: Record<
  AdminSchemas.CreateReportRequest["reason"],
  string
> = {
  spam: "Spam",
  scam: "Scam or fraud",
  misleading: "Misleading information",
  wrong_category: "Wrong category",
  harassment: "Harassment",
  other: "Other",
};

const LISTING_REASONS: AdminSchemas.CreateReportRequest["reason"][] = [
  "spam",
  "scam",
  "misleading",
  "wrong_category",
  "other",
];

const USER_REASONS: AdminSchemas.CreateReportRequest["reason"][] = [
  "spam",
  "scam",
  "misleading",
  "harassment",
  "other",
];

interface ReportSheetProps {
  targetType: "listing" | "user";
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportSheet({
  targetType,
  targetId,
  open,
  onOpenChange,
}: ReportSheetProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const createReport = useCreateReport();

  const [reason, setReason] = useState<
    AdminSchemas.CreateReportRequest["reason"] | null
  >(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reasons = targetType === "listing" ? LISTING_REASONS : USER_REASONS;

  const handleSelectReason = (
    r: AdminSchemas.CreateReportRequest["reason"],
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
        returnPath:
          targetType === "listing"
            ? `/(public)/listings/${targetId}`
            : `/(tabs)`,
      });
      router.push("/(auth)/phone");
      return;
    }

    if (isAuthenticated !== true) {
      // Auth state still loading; wait rather than firing an unauthenticated request
      return;
    }

    createReport.mutate(
      {
        targetType,
        targetId,
        reason,
        ...(reason === "other" ? { details } : {}),
      },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after a short delay so the reset is not visible during close animation
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
            <SheetTitle>Report</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <Icon as={X} className="size-5 text-foreground" />
              </Button>
            </SheetClose>
          </View>
          <SheetDescription>
            {submitted
              ? "Thanks, we received your report."
              : "Select a reason for reporting this item."}
          </SheetDescription>
        </SheetHeader>

        {submitted ? (
          <View className="items-center gap-4 py-6">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-success-500/10">
              <Icon as={Check} className="size-6 text-success-500" />
            </View>
            <Text className="text-center text-base text-foreground">
              Thanks, we received your report.
            </Text>
            <Button variant="default" className="w-full" onPress={handleClose}>
              <Text>Done</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-4">
            {/* Reason list */}
            <View className="gap-1">
              {reasons.map((r) => {
                const selected = reason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => handleSelectReason(r)}
                    className={cn(
                      "flex-row items-center justify-between rounded-lg px-4 py-3",
                      selected
                        ? "bg-primary/10"
                        : "bg-card active:bg-muted",
                    )}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      className={cn(
                        "text-base",
                        selected
                          ? "font-medium text-primary"
                          : "text-foreground",
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

            {/* Details input for "other" */}
            {showDetailsInput && (
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">
                  Please provide details
                </Text>
                <Input
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="h-24 py-2"
                  placeholder="Describe the issue..."
                  value={details}
                  onChangeText={setDetails}
                  maxLength={1000}
                />
                <Text className="text-xs text-muted-foreground text-right">
                  {details.length}/1000
                </Text>
              </View>
            )}

            {/* Error */}
            {createReport.isError && (
              <Text className="text-center text-sm text-destructive">
                {getErrorCopy(createReport.error)}
              </Text>
            )}

            {/* Submit */}
            <Button
              variant="default"
              className="w-full"
              disabled={!canSubmit || createReport.isPending}
              onPress={handleSubmit}
            >
              <Text>
                {createReport.isPending ? "Submitting..." : "Submit report"}
              </Text>
            </Button>
          </View>
        )}
      </SheetContent>
    </Sheet>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function getErrorCopy(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: { reason?: string } }).details?.reason ===
      "REPORT_TARGET_NOT_REPORTABLE"
  ) {
    return "This item is no longer available to report.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: { reason?: string } }).details?.reason ===
      "SELF_REPORT_NOT_ALLOWED"
  ) {
    return "This item is no longer available to report.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "details" in error &&
    typeof (error as { details?: unknown }).details === "object" &&
    (error as { details?: { reason?: string } }).details?.reason ===
      "USER_SUSPENDED"
  ) {
    return "Your account is restricted.";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 404
  ) {
    return "This item is no longer available to report.";
  }

  return "Something went wrong. Please try again.";
}
