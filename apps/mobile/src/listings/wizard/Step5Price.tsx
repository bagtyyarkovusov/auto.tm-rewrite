import { useState } from "react";
import { View } from "react-native";
import { Enums } from "@auto-tm/contracts";

import { useExchangeRates } from "../../api/exchange-rates/useExchangeRates";

import type { WizardSchemas } from "@auto-tm/contracts";

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
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-foreground">Amount *</Text>
      {wrapDisabled(
        <Input
          value={payload.priceAmount?.toString() ?? ""}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            onChange({
              priceAmount: Number.isNaN(num) ? undefined : num,
            });
          }}
          placeholder="Enter amount"
          keyboardType="number-pad"
          editable={!disabled}
        />,
        disabled,
      )}
      {fieldErrors?.priceAmount && (
        <Text className="text-sm text-destructive">
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
  const { currencyOpen, setCurrencyOpen, selectedCurrencyLabel } =
    usePriceStep(payload);

  return (
    <>
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Currency</Text>
        {wrapDisabled(
          <Button
            variant="outline"
            onPress={() => setCurrencyOpen(true)}
            disabled={disabled}
            className="justify-start"
          >
            <Text className="text-foreground">{selectedCurrencyLabel}</Text>
          </Button>,
          disabled,
        )}
      </View>

      <CatalogPickerSheet
        open={currencyOpen}
        onOpenChange={setCurrencyOpen}
        title="Select currency"
        searchPlaceholder="Search currencies..."
        search=""
        onSearchChange={() => {}}
        items={CURRENCIES.map((c) => ({ id: c.value, name: c.label }))}
        selectedId={payload.priceCurrency}
        emptyMessage="No currencies available"
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
    <Text className="text-sm text-muted-foreground">
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
  return (
    <View className="mt-2 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-foreground">Exchange possible</Text>
        <Switch
          checked={payload.acceptsExchange ?? false}
          onCheckedChange={(v) => onChange({ acceptsExchange: v })}
          disabled={disabled}
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-foreground">
          Installment available
        </Text>
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
    <View className="gap-4 py-4">
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
      <TmtEquivalent amount={tmtEquivalent} />
      <SellerTerms payload={payload} onChange={onChange} disabled={disabled} />
    </View>
  );
}
