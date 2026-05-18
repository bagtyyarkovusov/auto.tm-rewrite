import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Enums } from "@auto-tm/contracts";

import { useExchangeRates } from "../../api/exchange-rates/useExchangeRates";

import type { WizardPayload } from "./types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";



interface StepProps {
  payload: WizardPayload;
  onChange: (updates: Partial<WizardPayload>) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

const CURRENCIES: { value: Enums.Currency; label: string }[] = [
  { value: Enums.Currency.TMT, label: "TMT" },
  { value: Enums.Currency.USD, label: "USD" },
  { value: Enums.Currency.AED, label: "AED" },
];

export default function Step5Price({
  payload,
  onChange,
  disabled,
}: StepProps) {
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

  function handleCurrencyChange(newCurrency: Enums.Currency) {
    onChange({ priceCurrency: newCurrency, priceAmount: undefined });
    setCurrencyOpen(false);
  }

  const selectedCurrencyLabel =
    CURRENCIES.find((c) => c.value === payload.priceCurrency)?.label ?? "TMT";

  const wrapDisabled = (children: React.ReactNode) => {
    if (!disabled) return <>{children}</>;
    return <View className="opacity-50">{children}</View>;
  };

  return (
    <View className="gap-4 py-4">
      {/* Price amount */}
      <View className="gap-1">
        <Text className="text-sm font-medium text-foreground">Price *</Text>
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
        )}
      </View>

      {/* Currency */}
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
        )}
      </View>

      {/* TMT equivalent */}
      {tmtEquivalent !== null && (
        <Text className="text-sm text-muted-foreground">
          ≈ {tmtEquivalent.toLocaleString()} TMT
        </Text>
      )}

      {/* Seller terms */}
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

      {/* Currency Sheet */}
      <Sheet open={currencyOpen} onOpenChange={setCurrencyOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Select currency</SheetTitle>
          </SheetHeader>
          <ScrollView className="max-h-80">
            {CURRENCIES.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => handleCurrencyChange(c.value)}
                className="border-b border-border py-3"
              >
                <Text className="text-base text-foreground">{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            variant="outline"
            onPress={() => setCurrencyOpen(false)}
            className="mt-2"
          >
            <Text>Cancel</Text>
          </Button>
        </SheetContent>
      </Sheet>
    </View>
  );
}
