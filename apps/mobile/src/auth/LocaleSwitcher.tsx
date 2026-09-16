import { Pressable, View } from "react-native";

import { locales } from "../i18n/resources";
import { localeStore } from "../locale/localeStore";

import { Text } from "@/components/ui/text";

export function LocaleSwitcher() {
  const locale = localeStore((state) => state.locale) ?? "ru";
  const setLocale = localeStore((state) => state.setLocale);

  return (
    <View
      accessibilityLabel="Language"
      accessibilityRole="radiogroup"
      className="flex-row rounded-md bg-muted p-1"
    >
      {locales.map((l) => {
        const active = l === locale;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            className={
              active
                ? "min-h-[48px] min-w-[48px] items-center justify-center rounded-md bg-background px-4"
                : "min-h-[48px] min-w-[48px] items-center justify-center rounded-md px-4"
            }
            key={l}
            onPress={() => setLocale(l)}
          >
            <Text
              className={
                active
                  ? "text-sm font-medium uppercase text-foreground"
                  : "text-sm font-medium uppercase text-muted-foreground"
              }
            >
              {l}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
