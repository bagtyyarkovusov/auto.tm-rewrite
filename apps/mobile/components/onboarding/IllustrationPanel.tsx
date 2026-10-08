import { useColorScheme } from "nativewind";
import type { FC } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { SvgProps } from "react-native-svg";

import Chat from "@/assets/onboarding/onboarding-chat.svg";
import Find from "@/assets/onboarding/onboarding-find.svg";
import LanguageEn from "@/assets/onboarding/onboarding-language-en.svg";
import LanguageRu from "@/assets/onboarding/onboarding-language-ru.svg";
import LanguageTk from "@/assets/onboarding/onboarding-language-tk.svg";
import { Enter } from "@/components/ui/motion";
import { duration, useReduceMotion } from "@/lib/motion";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * The onboarding pictures (docs/prd/ui/75-illustration-style.md, "Onboarding
 * illustrations"). Their ink is `currentColor`, so one file serves light and
 * dark: the foreground token goes in as `color`. The red accent is in the file.
 */
const ART = {
  find: Find,
  chat: Chat,
  "language-tk": LanguageTk,
  "language-ru": LanguageRu,
  "language-en": LanguageEn,
} satisfies Record<string, FC<SvgProps>>;

export type OnboardingIllustrationName = keyof typeof ART;

type IllustrationPanelProps = {
  name: OnboardingIllustrationName;
  /** Fades and rises in once, on mount. For the first thing a screen shows. */
  enter?: boolean;
  className?: string;
};

/**
 * The tonal panel that holds a picture. It is the one flexible part of an
 * onboarding screen: it takes the height the text and buttons leave, and the
 * picture scales inside it. When `name` changes (the Language picture follows
 * the chosen language) the pictures cross-fade; Reduce Motion swaps them.
 *
 * The picture is decoration: the title beside it says the same thing, so the
 * panel is hidden from screen readers.
 */
export function IllustrationPanel({ name, enter = false, className }: IllustrationPanelProps) {
  const { colorScheme } = useColorScheme();
  const reduceMotion = useReduceMotion();
  const Art = ART[name];
  const ink = `hsl(${THEME[colorScheme === "dark" ? "dark" : "light"].foreground})`;
  const Panel = enter ? Enter : View;

  return (
    <Panel
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID={`onboarding-illustration-${name}`}
      className={cn("mx-6 mb-5 mt-1 min-h-24 flex-1 rounded-3xl bg-card p-3", className)}
    >
      <View className="flex-1">
        <Animated.View
          key={name}
          entering={reduceMotion ? undefined : FadeIn.duration(duration.fast)}
          exiting={reduceMotion ? undefined : FadeOut.duration(duration.fast)}
          style={StyleSheet.absoluteFill}
        >
          <Art width="100%" height="100%" color={ink} />
        </Animated.View>
      </View>
    </Panel>
  );
}
