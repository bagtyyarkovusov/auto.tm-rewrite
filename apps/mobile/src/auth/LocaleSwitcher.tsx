import { Pressable, Text, View } from "react-native";

import { type Locale, locales } from "./copy";

type LocaleSwitcherProps = {
  value: Locale;
  onChange: (locale: Locale) => void;
};

export function LocaleSwitcher({ value, onChange }: LocaleSwitcherProps) {
  return (
    <View
      accessibilityLabel="Language"
      className="flex-row rounded-md bg-neutral-100 p-1 dark:bg-neutral-900"
    >
      {locales.map((locale) => {
        const active = locale === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={
              active
                ? "rounded-md bg-neutral-0 px-2 py-1 dark:bg-neutral-800"
                : "rounded-md px-2 py-1"
            }
            key={locale}
            onPress={() => onChange(locale)}
          >
            <Text
              className={
                active
                  ? "text-sm font-medium uppercase text-neutral-900 dark:text-neutral-50"
                  : "text-sm font-medium uppercase text-neutral-500 dark:text-neutral-400"
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
