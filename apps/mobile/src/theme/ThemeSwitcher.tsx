import { Moon, Sun, Smartphone } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { themeStore, type ThemePreference } from "./themeStore";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Smartphone },
];

export function ThemeSwitcher() {
  const { t } = useTranslation("account");
  const theme = themeStore((state) => state.theme);
  const setTheme = themeStore((state) => state.setTheme);

  return (
    <View className="flex-row rounded-md bg-muted p-1">
      {options.map((option) => {
        const active = theme === option.value;
        const labelKey =
          option.value === "light"
            ? "themeLight"
            : option.value === "dark"
              ? "themeDark"
              : "themeSystem";

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setTheme(option.value)}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-1.5 rounded-md px-2 py-2",
              active ? "bg-background" : "",
            )}
          >
            <Icon
              as={option.icon}
              className={cn(
                "size-4",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            />
            <Text
              className={cn(
                "text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
