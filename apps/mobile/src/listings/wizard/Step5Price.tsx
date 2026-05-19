import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Enums } from "@auto-tm/contracts";

import { useExchangeRates } from "../../api/exchange-rates/useExchangeRates";

import type { WizardSchemas } from "@auto-tm/contracts";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

export default function Step5Price({
  payload,
  onChange,
  fieldErrors,
  disabled,
}: Step5PriceProps) {
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
    // CRITICAL FIX: Preserve price amount when changing currency
    onChange({ priceCurrency: newCurrency });
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
        )}
        {fieldErrors?.priceAmount && (
          <Text className="text-sm text-destructive">
            {fieldErrors.priceAmount}
          </Text>
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
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>Select currency</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onPress={() => setCurrencyOpen(false)}
              accessibilityLabel="Close"
            >
              <Icon as={X} className="size-5 text-foreground" />
            </Button>
          </SheetHeader>
          <ScrollView>
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
        </SheetContent>
      </Sheet>
    </View>
  );
}
