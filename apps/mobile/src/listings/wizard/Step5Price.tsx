import { useState } from "react";
import { View } from "react-native";
import { Enums } from "@auto-tm/contracts";
import type { WizardSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { useExchangeRates } from "../../api/exchange-rates/useExchangeRates";


import { CatalogPickerSheet } from "@/components/listings/wizard/CatalogPickerSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

interface Step5PriceProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

const CURRENCIES: { value: Enums.Currency; label: string }[] = [
  { value: Enums.Currency.TMT, label: "TMT" },
  { value: Enums.Currency.USD, label: "USD" },
  { value: Enums.Currency.AED, label: "AED" },
];

function usePriceStep(payload: WizardSchemas.WizardDraftPayload) {
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { data: ratesData } = useExchangeRates();

  const rate = ratesData?.rates.find(
    (r) =>
      r.fromCurrency === payload.priceCurrency && r.toCurrency === "TMT",
  );
  const tmtEquivalent =
    rate && payload.priceAmount
      ? Math.round(payload.priceAmount * rate.rate)
      : null;

  const selectedCurrencyLabel =
    CURRENCIES.find((c) => c.value === payload.priceCurrency)?.label ?? "TMT";

  return {
    currencyOpen,
    setCurrencyOpen,
    tmtEquivalent,
    selectedCurrencyLabel,
  };
}

function wrapDisabled(children: React.ReactNode, disabled: boolean) {
  if (!disabled) return <>{children}</>;
  return <View className="opacity-50">{children}</View>;
}

function PriceInput({
  payload,
  onChange,
  fieldErrors,
  disabled,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-1.5 flex-1">
      <Text className="text-sm font-medium text-foreground">{t("amount")} *</Text>
      {wrapDisabled(
        <Input
          value={payload.priceAmount?.toString() ?? ""}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            const updates: Partial<WizardSchemas.WizardDraftPayload> = {
              priceAmount: Number.isNaN(num) ? undefined : num,
            };
            if (!Number.isNaN(num) && !payload.priceCurrency) {
              updates.priceCurrency = Enums.Currency.TMT;
            }
            onChange(updates);
          }}
          placeholder={t("priceAmountPlaceholder")}
          keyboardType="number-pad"
          editable={!disabled}
        />,
        disabled,
      )}
      {fieldErrors?.priceAmount && (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          {fieldErrors.priceAmount}
        </Text>
      )}
    </View>
  );
}

function CurrencyPicker({
  payload,
  onChange,
  disabled,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const { currencyOpen, setCurrencyOpen, selectedCurrencyLabel } =
    usePriceStep(payload);

  return (
    <>
      <View className="gap-1.5 w-[120px]">
        <Text className="text-sm font-medium text-foreground">{t("currency")}</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setCurrencyOpen(true)}
            disabled={disabled}
            className="justify-center h-[52px]"
          >
            <Text className="text-foreground font-medium">{selectedCurrencyLabel}</Text>
          </Button>,
          disabled,
        )}
      </View>

      <CatalogPickerSheet
        open={currencyOpen}
        onOpenChange={setCurrencyOpen}
        title={t("selectCurrency")}
        searchPlaceholder={t("searchPlaceholder")}
        search=""
        onSearchChange={() => {}}
        items={CURRENCIES.map((c) => ({ id: c.value, name: c.label }))}
        selectedId={payload.priceCurrency}
        emptyMessage={t("noOptionsAvailable")}
        isLoading={false}
        isError={false}
        onSelect={(id) => {
          onChange({ priceCurrency: id as Enums.Currency });
          setCurrencyOpen(false);
        }}
      />
    </>
  );
}

function TmtEquivalent({ amount }: { amount: number | null }) {
  if (amount === null) return null;
  return (
    <Text className="text-xs text-muted-foreground">
      ≈ {amount.toLocaleString()} TMT
    </Text>
  );
}

function SellerTerms({
  payload,
  onChange,
  disabled,
}: {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View className="rounded-xl border border-border p-4 gap-1">
      <Text className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
        {t("sellerTerms")}
      </Text>
      <View className="flex-row items-center justify-between py-2">
        <View className="gap-0.5">
          <Text className="text-base text-foreground">{t("exchangePossible")}</Text>
          <Text className="text-xs text-muted-foreground">{t("willingToTrade")}</Text>
        </View>
        <Switch
          checked={payload.acceptsExchange ?? false}
          onCheckedChange={(v) => onChange({ acceptsExchange: v })}
          disabled={disabled}
        />
      </View>
      <View className="h-px bg-border" />
      <View className="flex-row items-center justify-between py-2">
        <View className="gap-0.5">
          <Text className="text-base text-foreground">{t("installmentAvailableLabel")}</Text>
          <Text className="text-xs text-muted-foreground">{t("buyerCanPayInstallments")}</Text>
        </View>
        <Switch
          checked={payload.installmentAvailable ?? false}
          onCheckedChange={(v) => onChange({ installmentAvailable: v })}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

export default function Step5Price({
  payload,
  onChange,
  fieldErrors,
  disabled = false,
}: Step5PriceProps) {
  const { tmtEquivalent } = usePriceStep(payload);

  return (
    <View className="gap-5 py-5">
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-foreground">{t("price")} *</Text>
        <View className="flex-row gap-3 items-start">
          <PriceInput
            payload={payload}
            onChange={onChange}
            fieldErrors={fieldErrors}
            disabled={disabled}
          />
          <CurrencyPicker
            payload={payload}
            onChange={onChange}
            disabled={disabled}
          />
        </View>
        <TmtEquivalent amount={tmtEquivalent} />
      </View>
      <SellerTerms payload={payload} onChange={onChange} disabled={disabled} />
    </View>
  );
}
