import { View } from "react-native";
import type { WizardSchemas } from "@auto-tm/contracts";

import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

interface Step1VinProps {
  payload: WizardSchemas.WizardDraftPayload;
  onChange: (updates: Partial<WizardSchemas.WizardDraftPayload>) => void;
  fieldErrors?: Record<string, string>;
  disabled?: boolean;
}

export default function Step1Vin({
  payload,
  onChange,
  fieldErrors,
  disabled,
}: Step1VinProps) {
  const vinError = fieldErrors?.vin;

  return (
    <View className="gap-5 py-5">
      <Text className="text-2xl font-semibold text-foreground">
        VIN or chassis number
      </Text>

      <Text className="text-sm text-muted-foreground">
        Optional. You can fill details manually.
      </Text>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-foreground">
          VIN / chassis number
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
          />
        </View>
        {vinError && (
          <Text className="text-sm text-destructive">{vinError}</Text>
        )}
      </View>

      <Text className="text-sm text-muted-foreground">
        No checking is done in this version.
      </Text>
    </View>
  );
}
