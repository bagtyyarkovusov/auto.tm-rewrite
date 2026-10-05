import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { formatResendWait } from "../../components/auth/CodeEntryForm";
import { PhoneInput } from "../../components/auth/PhoneInput";
import { useRepublishListing } from "../../src/api/listings/useRepublishListing";
import { useRequestContactPhoneCode } from "../../src/api/listings/useRequestContactPhoneCode";
import { usePhoneField } from "../../src/auth/usePhoneField";
import { getContactPhoneRequestErrorCopy } from "../../src/listings/wizard/contactPhoneError";
import { HELP_HREF } from "../../src/navigation/helpHref";
import { useSafeBack } from "../../src/navigation/useSafeBack";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The "Another number" entry of the Contact step: a `+993` number and Send
 * code. A number the server already trusts (`status: "confirmed"`) skips the
 * code screen and is handed back to the caller; for a relist the confirmed
 * number relists the Listing right away.
 */
export default function ContactPhoneScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    reconfirm?: string;
    purpose?: string;
    listingId?: string;
    returnPathname?: string;
  }>();
  const { t } = useTranslation();
  const goBack = useSafeBack();
  const { show } = useToast();
  const requestCode = useRequestContactPhoneCode();
  const republish = useRepublishListing();

  const reconfirm = firstParam(params.reconfirm) === "1";
  const purpose = firstParam(params.purpose) === "relist" ? "relist" : "listing";
  const listingId = firstParam(params.listingId);
  const returnPathname =
    firstParam(params.returnPathname) ??
    (purpose === "relist" ? "/listings/manage" : "/(tabs)/sell");

  const phone = usePhoneField(
    (key: string) => t(`auth:${key}`),
    firstParam(params.phone),
  );
  const [dailyLimit, setDailyLimit] = useState(false);

  async function finishConfirmed(canonicalPhone: string) {
    if (purpose === "relist" && listingId) {
      try {
        await republish.mutateAsync(listingId);
        show({ title: t("ownerDoneRelist"), variant: "success" });
      } catch {
        // The number is confirmed now; a failed relist can be retried from
        // the Listing. Say so and return there either way.
        show({ title: t("actionFailed"), variant: "destructive" });
      }
      router.dismissTo(returnPathname);
      return;
    }
    show({ title: t("contactPhoneAlreadyConfirmed"), variant: "success" });
    router.dismissTo({
      pathname: returnPathname,
      params: { confirmedContactPhone: canonicalPhone },
    });
  }

  async function handleSendCode() {
    phone.touch();
    const canonicalPhone = phone.canonicalPhone;
    if (!canonicalPhone) {
      phone.setRequestError(t("contactPhoneFormatError"));
      return;
    }
    if (requestCode.isPending) return;

    setDailyLimit(false);
    try {
      const result = await requestCode.mutateAsync({ phone: canonicalPhone });
      if (result.status === "confirmed") {
        await finishConfirmed(canonicalPhone);
        return;
      }
      router.push({
        pathname: "/listings/contact-phone-code",
        params: {
          phone: canonicalPhone,
          resendInSeconds: String(result.resendInSeconds),
          purpose,
          returnPathname,
          ...(listingId ? { listingId } : {}),
          ...(__DEV__ && result.testCode ? { testCode: result.testCode } : {}),
        },
      });
    } catch (error) {
      const copy = getContactPhoneRequestErrorCopy(error, t);
      phone.setRequestError(
        copy.retryInSeconds != null
          ? t("contactPhoneRateWait", {
              time: formatResendWait(copy.retryInSeconds),
            })
          : copy.message,
      );
      setDailyLimit(copy.dailyLimit);
    }
  }

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center px-4 pb-3">
          <Button
            accessibilityLabel={t("back")}
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onPress={goBack}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text className="text-2xl font-semibold leading-snug text-foreground">
              {reconfirm
                ? t("confirmNumberAgainTitle")
                : t("anotherContactNumberTitle")}
            </Text>
            <Text className="text-base leading-normal text-muted-foreground">
              {t("contactPhoneCodeInfo")}
            </Text>
          </View>

          <View className="gap-2">
            <PhoneInput
              accessibilityLabel={t("auth:phoneLabel")}
              hasError={phone.showError}
              keyboardType="phone-pad"
              onBlur={phone.touch}
              onChangeText={phone.onChangeText}
              placeholder={t("auth:phonePlaceholder")}
              textContentType="telephoneNumber"
              value={phone.display}
              // A relist confirms the Listing's own number only (ADR-0081);
              // a different number goes through Edit.
              editable={purpose !== "relist"}
            />
            <Text
              className={
                phone.showError
                  ? "text-sm leading-snug text-destructive"
                  : "text-sm leading-snug text-muted-foreground"
              }
              accessibilityLiveRegion="polite"
            >
              {phone.helperText}
            </Text>
            {dailyLimit ? (
              <Pressable
                accessibilityRole="link"
                className="self-start"
                onPress={() => router.push(HELP_HREF)}
              >
                <Text className="text-sm text-info-600 underline dark:text-info-400">
                  {t("support:help")}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Button
            variant="brand"
            size="lg"
            disabled={requestCode.isPending}
            onPress={handleSendCode}
          >
            <Text>{t("sendCode")}</Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
