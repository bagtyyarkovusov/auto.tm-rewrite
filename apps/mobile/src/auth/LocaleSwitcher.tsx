import { Pressable, View } from "react-native";

import { type Locale, locales } from "./copy";

import { Text } from "@/components/ui/text";


type LocaleSwitcherProps = {
  value: Locale;
  onChange: (locale: Locale) => void;
};

export function LocaleSwitcher({ value, onChange }: LocaleSwitcherProps) {
  return (
    <View
      accessibilityLabel="Language"
      className="flex-row rounded-md bg-muted p-1"
    >
      {locales.map((locale) => {
        const active = locale === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={
              active
                ? "items-center justify-center rounded-md bg-background px-2 py-1"
                : "items-center justify-center rounded-md px-2 py-1"
            }
            key={locale}
            onPress={() => onChange(locale)}
          >
            <Text
              className={
                active
                  ? "text-sm font-medium uppercase text-foreground"
                  : "text-sm font-medium uppercase text-muted-foreground"
              }
            >
              {locale}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
