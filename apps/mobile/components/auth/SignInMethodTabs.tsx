import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export type SignInMethod = "phone" | "email";

interface SignInMethodTabsProps {
  value: SignInMethod;
  onChange: (method: SignInMethod) => void;
}

export function SignInMethodTabs({ value, onChange }: SignInMethodTabsProps) {
  const { t } = useTranslation("auth");

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-full bg-muted p-1"
    >
      {(["phone", "email"] as const).map((method) => (
        <Button
          key={method}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === method }}
          className="h-10 flex-1 rounded-full"
          size="sm"
          variant={value === method ? "secondary" : "ghost"}
          onPress={() => onChange(method)}
        >
          <Text>{t(method)}</Text>
        </Button>
      ))}
    </View>
  );
}
