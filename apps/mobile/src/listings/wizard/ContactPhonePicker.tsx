import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { contactPhoneDaysLeft } from "./contactPhoneDaysLeft";
import { resolveContactPhoneSelection } from "./contactPhoneSelection";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ContactPhonePickerProps {
  /** The draft or edit payload's chosen number (canonical `+993…`). */
  selectedPhone: string | undefined;
  onSelect: (phone: string) => void;
  /** The seller's sign-in phone from `useMe`; null for an email-only User. */
  accountPhone?: string | null;
  /** Reusable confirmed numbers from `GET /me/contact-phones`. */
  confirmedPhones?: ListingsSchemas.VerifiedContactPhone[];
  /** Edit mode: the Listing's stored number, selectable without a code. */
  currentListingPhone?: string | null;
  onAnotherNumber: () => void;
  /** Tapping a saved number past its 7 days opens the number screen prefilled. */
  onConfirmExpired: (phone: string) => void;
  /** The Continue error, shown once the seller tried to advance. */
  selectionError?: string | null;
  /** A publish answered CONTACT_PHONE_*; the seller must confirm the phone. */
  publishPhoneError?: boolean;
  disabled?: boolean;
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <View
      className={cn(
        "size-5 items-center justify-center rounded-full border-2",
        selected ? "border-primary" : "border-muted-foreground",
      )}
    >
      {selected ? <View className="size-2.5 rounded-full bg-primary" /> : null}
    </View>
  );
}

function PhoneRow({
  phone,
  sub,
  selected,
  destructive,
  chevron,
  disabled,
  onPress,
}: {
  phone: string;
  sub: string;
  selected: boolean;
  destructive?: boolean;
  chevron?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={phone}
      accessibilityState={{ selected, disabled: disabled ?? false }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-foreground">{phone}</Text>
        <Text
          className={cn(
            "text-xs",
            destructive ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {sub}
        </Text>
      </View>
      {chevron ? (
        <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
      ) : (
        <RadioMark selected={selected} />
      )}
    </Pressable>
  );
}

/**
 * The Contact step's phone picker (ADR-0056, ADR-0081): the sign-in phone
 * first, then the numbers still inside their 7-day reuse window with the days
 * left, then "Another number". A saved number whose window has ended is shown
 * but not selectable — tapping it starts a new confirmation. An email-only
 * User gets an explanation instead of a preselected number.
 */
export function ContactPhonePicker({
  selectedPhone,
  onSelect,
  accountPhone,
  confirmedPhones = [],
  currentListingPhone,
  onAnotherNumber,
  onConfirmExpired,
  selectionError,
  publishPhoneError = false,
  disabled = false,
}: ContactPhonePickerProps) {
  const { t } = useTranslation();

  const selection = resolveContactPhoneSelection({
    phone: selectedPhone,
    accountPhone,
    currentListingPhone,
    confirmedPhones,
  });

  const listedPhones = new Set(confirmedPhones.map((p) => p.phone));
  const showCurrentRow =
    currentListingPhone != null &&
    currentListingPhone !== accountPhone &&
    !listedPhones.has(currentListingPhone);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        {t("contactPhone")}
      </Text>
      <Text className="text-xs text-muted-foreground">
        {t("contactPhoneHelp")}
      </Text>

      {publishPhoneError ? (
        <View className="rounded-md bg-destructive/10 px-3 py-2">
          <Text
            className="text-sm text-destructive"
            accessibilityLiveRegion="polite"
          >
            {t("publishPhoneConfirm")}
          </Text>
        </View>
      ) : null}

      {!accountPhone ? (
        <Text className="py-1 text-sm text-muted-foreground">
          {t("emailOnlyContactNote")}
        </Text>
      ) : null}

      <View>
        {accountPhone ? (
          <PhoneRow
            phone={accountPhone}
            sub={t("signInPhoneSub")}
            selected={selection.kind === "account"}
            disabled={disabled}
            onPress={() => onSelect(accountPhone)}
          />
        ) : null}

        {showCurrentRow && currentListingPhone ? (
          <PhoneRow
            phone={currentListingPhone}
            sub={t("currentListingPhone")}
            selected={selection.kind === "current"}
            disabled={disabled}
            onPress={() => onSelect(currentListingPhone)}
          />
        ) : null}

        {confirmedPhones.map((entry) => (
          <PhoneRow
            key={entry.phone}
            phone={entry.phone}
            sub={t("confirmedDaysLeft", {
              count: entry.reusableUntil
                ? contactPhoneDaysLeft(entry.reusableUntil)
                : 0,
            })}
            selected={selection.kind === "confirmed" && selectedPhone === entry.phone}
            disabled={disabled}
            onPress={() => onSelect(entry.phone)}
          />
        ))}

        {selection.kind === "stale" && selectedPhone ? (
          <PhoneRow
            phone={selectedPhone}
            sub={t("confirmationExpiredTap")}
            selected={false}
            destructive
            chevron
            disabled={disabled}
            onPress={() => onConfirmExpired(selectedPhone)}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("anotherNumber")}
          disabled={disabled}
          onPress={onAnotherNumber}
          className="min-h-12 flex-row items-center gap-3 py-3 active:opacity-70"
        >
          <Text className="flex-1 text-base text-primary">
            {t("anotherNumber")}
          </Text>
          <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
        </Pressable>
      </View>

      {selectionError ? (
        <Text
          className="text-sm text-destructive"
          accessibilityLiveRegion="polite"
        >
          {selectionError}
        </Text>
      ) : null}
    </View>
  );
}
