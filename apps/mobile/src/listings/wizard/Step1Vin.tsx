import { View } from "react-native";
import type { WizardSchemas } from "@auto-tm/contracts";

import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

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
    <View className="gap-6 py-4">
      <View className="gap-2">
        <Text className="font-uber text-[22px] font-bold leading-tight tracking-tight text-foreground">
          VIN / chassis number
        </Text>
        <Text className="text-base leading-normal text-gray-600">
          Optional. You can fill details manually if you don't have a VIN.
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-foreground">
          VIN / chassis number
        </Text>
        <View className={cn(disabled && "opacity-50")}>
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
          <Text className="text-sm font-medium text-error">{vinError}</Text>
        )}
      </View>

      <Text className="text-sm text-gray-500">
        No VIN checking is done in this version.
      </Text>
    </View>
  );
}
