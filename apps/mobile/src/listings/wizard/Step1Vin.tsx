import { View } from "react-native";

import type { WizardPayload } from "./types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";


interface StepProps {
  payload: WizardPayload;
  onChange: (updates: Partial<WizardPayload>) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

export default function Step1Vin({ payload, onChange, disabled }: StepProps) {
  return (
    <View className="gap-4 py-4">
      <Text className="text-base text-foreground">
        Enter your vehicle&apos;s VIN (optional)
      </Text>
      <View className={disabled ? "opacity-50" : ""}>
        <Input
          value={payload.vin ?? ""}
          onChangeText={(text) => onChange({ vin: text || undefined })}
          placeholder="VIN number"
          editable={!disabled}
          autoCapitalize="characters"
          maxLength={17}
        />
      </View>
      <View className={disabled ? "opacity-50" : ""}>
        <Button
          variant="outline"
          onPress={() => onChange({ vin: undefined })}
          disabled={disabled}
        >
          <Text>Skip</Text>
        </Button>
      </View>
    </View>
  );
}
