import { Check } from "lucide-react-native";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { selectionTick } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { localeNames, locales, type Locale } from "@/src/i18n/resources";
import { localeStore } from "@/src/locale/localeStore";

/**
 * The language choice on the first onboarding screen: one row per language,
 * each named in itself. Choosing a row stores the language, and the whole
 * screen follows at once. One row is always chosen.
 *
 * `LocaleSwitcher` stays the compact control on the sign-in screens.
 */
export function LanguageRows({ className }: { className?: string }) {
  const { t } = useTranslation("onboarding");
  const chosen = localeStore((state) => state.locale) ?? "ru";
  const setLocale = localeStore((state) => state.setLocale);

  const choose = (locale: Locale) => {
    if (locale === chosen) return;
    setLocale(locale);
    selectionTick();
    // Said in the language just chosen: its own name.
    AccessibilityInfo.announceForAccessibility(localeNames[locale]);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("languageGroup")}
      className={cn("overflow-hidden rounded-2xl bg-card", className)}
    >
      {locales.map((locale, index) => {
        const checked = locale === chosen;

        return (
          <Fragment key={locale}>
            {index > 0 && <View className="mx-5 h-px bg-border" />}
            <PressableScale
              feedback="surface"
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={localeNames[locale]}
              onPress={() => choose(locale)}
              className="min-h-control-lg flex-row items-center justify-between gap-3 px-5 py-2 active:bg-accent"
            >
              <Text
                className={cn(
                  "flex-1 text-body text-foreground",
                  checked ? "font-semibold" : "font-medium",
                )}
              >
                {localeNames[locale]}
              </Text>
              {checked ? (
                <View className="size-6 items-center justify-center rounded-full bg-primary">
                  <Icon as={Check} className="size-3.5 text-primary-foreground" strokeWidth={3} />
                </View>
              ) : (
                <View className="size-6 rounded-full border-2 border-border" />
              )}
            </PressableScale>
          </Fragment>
        );
      })}
    </View>
  );
}
