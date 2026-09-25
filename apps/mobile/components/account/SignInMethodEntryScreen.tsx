import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { useSafeBack } from "../../src/navigation/useSafeBack";

import { SafeScreen } from "@/components/navigation/SafeScreen";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

interface SignInMethodEntryScreenProps {
  title: string;
  helper: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  children: ReactNode;
}

/** Chrome for adding or replacing a Sign-in Method from Profile. */
export function SignInMethodEntryScreen({
  title,
  helper,
  canSubmit,
  isSubmitting,
  onSubmit,
  children,
}: SignInMethodEntryScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation("auth");
  const goBack = useSafeBack("/profile");

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-4 pb-3 flex-row items-center gap-2">
          <Button
            accessibilityLabel={t("common:back")}
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onPress={goBack}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
          <Text
            className="flex-1 text-2xl font-heading text-foreground"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        <View className="flex-1 px-4 pt-4 gap-8">
          <Text className="text-base leading-normal text-muted-foreground">
            {helper}
          </Text>

          {children}

          <Button
            disabled={!canSubmit}
            size="lg"
            variant="brand"
            onPress={() => void onSubmit()}
          >
            {isSubmitting ? (
              <ActivityIndicator
                color={`hsl(${THEME[isDark ? "dark" : "light"].primaryForeground})`}
              />
            ) : (
              <Text>{t("getCode")}</Text>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
