import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { CrossFade } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import { selectionTick } from "@/lib/haptics";
import { spring } from "@/lib/motion";

export type SignInMethod = "phone" | "email";

interface SignInMethodTabsProps {
  value: SignInMethod;
  onChange: (method: SignInMethod) => void;
}

export function SignInMethodTabs({ value, onChange }: SignInMethodTabsProps) {
  const { t } = useTranslation("auth");
  const [slot, setSlot] = useState(0);
  const sprungFor = useRef(value);
  const position = useSharedValue(0);
  useEffect(() => {
    if (sprungFor.current === value) return;
    sprungFor.current = value;
    position.value = withSpring(value === "email" ? slot : 0, { ...spring.snappy, overshootClamping: true });
  }, [value, slot, position]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-full bg-muted p-1"
      onLayout={(event) => {
        const next = Math.max(0, (event.nativeEvent.layout.width - 8) / 2);
        // First layout — and any resize without a value change — places the
        // pill directly; only a changed selection springs it.
        if (sprungFor.current === value) position.value = value === "email" ? next : 0;
        setSlot(next);
      }}
    >
      <Animated.View pointerEvents="none" className="absolute bottom-1 left-1 top-1 rounded-full bg-card" style={[{ width: slot }, indicator]} />
      {(["phone", "email"] as const).map((method) => (
        <Button
          key={method}
          role="tab"
          accessibilityRole="tab"
          accessibilityLabel={t(method)}
          accessibilityState={{ selected: value === method }}
          className="h-11 flex-1 rounded-full bg-transparent active:bg-transparent"
          size="sm"
          variant="ghost"
          onPress={() => {
            if (method === value) return;
            selectionTick();
            onChange(method);
          }}
        >
          <CrossFade active={value === method}
            on={<Text className="text-callout font-medium text-foreground">{t(method)}</Text>}
            off={<Text className="text-callout font-medium text-muted-foreground">{t(method)}</Text>}
          />
        </Button>
      ))}
    </View>
  );
}
