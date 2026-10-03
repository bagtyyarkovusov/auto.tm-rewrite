import { View } from "react-native";
import type { WizardSchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

interface VinFieldProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * The optional VIN at the bottom of the Car step. Nothing decodes a VIN
 * (ADR-0053), so the helper promises no auto-fill.
 */
export function VinField({ payload, onChange, error, disabled }: VinFieldProps) {
  const { t } = useTranslation();

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        {t("vin")}
      </Text>
      <View className={disabled ? "opacity-50" : ""}>
        <Input
          value={payload.vin ?? ""}
          onChangeText={(text) =>
            onChange({ vin: text.trim() === "" ? undefined : text })
          }
          placeholder="WBA1234567890ABCD"
          editable={!disabled}
          autoCapitalize="characters"
          maxLength={17}
          accessibilityLabel={t("vin")}
        />
      </View>
      <Text className="text-xs text-muted-foreground">{t("vinHelper")}</Text>
      {error && (
        <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
