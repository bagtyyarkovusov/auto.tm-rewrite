import { useRouter } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { useListingDetail } from "../../api/listings/useListingDetail";

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
}

/**
 * A relist refused with CONTACT_PHONE_NOT_CONFIRMED (ADR-0081): the Listing's
 * number was confirmed more than 7 days ago. The sheet confirms the Listing's
 * own number only — a different number goes through Edit, so there is no
 * "Another number" here. Send code opens the number screen for a relist.
 */
export function RelistContactPhoneSheet({
  open,
  listingId,
  returnPathname,
  onOpenChange,
}: RelistContactPhoneSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const detail = useListingDetail(listingId ?? "", { enabled: open });
  const phone = detail.data?.contactPhone;

  function handleSendCode() {
    if (!listingId || !phone) return;
    onOpenChange(false);
    router.push({
      pathname: "/listings/contact-phone",
      params: {
        phone,
        reconfirm: "1",
        purpose: "relist",
        listingId,
        returnPathname,
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent closeOnBackdropPress style={{ height: 320 }}>
        <SheetHeader>
          <SheetTitle>{t("relistPhoneConfirmTitle")}</SheetTitle>
        </SheetHeader>
        <Text className="text-sm text-muted-foreground">
          {phone
            ? t("relistPhoneConfirmDescription", { phone })
            : t("loading")}
        </Text>
        <View className="mt-4 gap-2">
          <Button
            variant="brand"
            disabled={!phone}
            onPress={handleSendCode}
          >
            <Text>{t("sendCode")}</Text>
          </Button>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>{t("cancel")}</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
