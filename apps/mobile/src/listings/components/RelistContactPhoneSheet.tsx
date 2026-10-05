import { useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { formatResendWait } from "../../../components/auth/CodeEntryForm";
import { useListingDetail } from "../../api/listings/useListingDetail";
import { useRepublishListing } from "../../api/listings/useRepublishListing";
import { useRequestContactPhoneCode } from "../../api/listings/useRequestContactPhoneCode";
import { HELP_HREF } from "../../navigation/helpHref";
import { getContactPhoneRequestErrorCopy } from "../wizard/contactPhoneError";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

interface RelistContactPhoneSheetProps {
  open: boolean;
  listingId: string | null;
  /** Where the relist code flow returns; the caller's own screen. */
  returnPathname: string;
  onOpenChange: (open: boolean) => void;
  /** The sheet relisted the Listing itself, because the number needed no code. */
  onRelisted?: () => void;
}

/**
 * A relist refused with CONTACT_PHONE_NOT_CONFIRMED (ADR-0081): the Listing's
 * number was confirmed more than 7 days ago. The sheet confirms the Listing's
 * own number only (a different number goes through Edit), so there is no
 * "Another number" here. Send code asks for the code and opens the code
 * screen; a number the server already trusts relists at once. A refused
 * request, or a relist that fails, is worded in the sheet, which stays open.
 */
export function RelistContactPhoneSheet({
  open,
  listingId,
  returnPathname,
  onOpenChange,
  onRelisted,
}: RelistContactPhoneSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const detail = useListingDetail(listingId ?? "", { enabled: open });
  const requestCode = useRequestContactPhoneCode();
  const republish = useRepublishListing();
  const phone = detail.data?.contactPhone;
  const [error, setError] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState(false);
  const [isSending, setIsSending] = useState(false);

  function close() {
    setError(null);
    setDailyLimit(false);
    onOpenChange(false);
  }

  async function handleSendCode() {
    if (!listingId || !phone || isSending) return;

    setError(null);
    setDailyLimit(false);
    setIsSending(true);
    try {
      const result = await requestCode.mutateAsync({ phone });
      if (result.status === "confirmed") {
        try {
          await republish.mutateAsync(listingId);
        } catch {
          // The number is fine; Send code tries the relist again.
          setError(t("actionFailed"));
          return;
        }
        close();
        onRelisted?.();
        return;
      }
      close();
      router.push({
        pathname: "/listings/contact-phone-code",
        params: {
          phone,
          resendInSeconds: String(result.resendInSeconds),
          purpose: "relist",
          listingId,
          returnPathname,
          ...(__DEV__ && result.testCode ? { testCode: result.testCode } : {}),
        },
      });
    } catch (requestError) {
      const copy = getContactPhoneRequestErrorCopy(requestError, t);
      setError(
        copy.retryInSeconds != null
          ? t("contactPhoneRateWait", {
              time: formatResendWait(copy.retryInSeconds),
            })
          : copy.message,
      );
      setDailyLimit(copy.dailyLimit);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else close();
      }}
    >
      {/* `compact` sizes the sheet to its content, so an error line fits. */}
      <SheetContent compact closeOnBackdropPress>
        <SheetHeader>
          <SheetTitle>{t("relistPhoneConfirmTitle")}</SheetTitle>
        </SheetHeader>
        <Text className="text-sm text-muted-foreground">
          {phone
            ? t("relistPhoneConfirmDescription", { phone })
            : t("loading")}
        </Text>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm leading-snug text-destructive"
          >
            {error}
          </Text>
        ) : null}
        {dailyLimit ? (
          <Button
            variant="link"
            role="link"
            accessibilityRole="link"
            className="self-start px-0"
            onPress={() => {
              close();
              router.push(HELP_HREF);
            }}
          >
            <Text className="underline">{t("support:help")}</Text>
          </Button>
        ) : null}
        <View className="gap-2">
          <Button
            variant="brand"
            disabled={!phone || isSending}
            onPress={handleSendCode}
          >
            <Text>{t("sendCode")}</Text>
          </Button>
          <Button variant="outline" onPress={close}>
            <Text>{t("cancel")}</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
