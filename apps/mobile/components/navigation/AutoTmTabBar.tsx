import {
  Heart,
  LayoutGrid,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

type TabRoute = {
  name: string;
  key: string;
  params?: Record<string, unknown>;
};

interface TabBarProps {
  state: {
    routes: TabRoute[];
    index: number;
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarAccessibilityLabel?: string;
      };
      navigation: {
        navigate: (name: string, params?: Record<string, unknown>) => void;
      };
    }
  >;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

const TAB_ICONS: Record<string, React.ComponentType<unknown>> = {
  index: Search,
  favorites: Heart,
  sell: Plus,
  chat: MessageSquare,
  services: LayoutGrid,
};

export default function AutoTmTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center border-t border-border/60 bg-background/90"
      style={{
        paddingBottom: insets.bottom,
        // Frosted glass on iOS; Android falls back to solid bg-background/90
        ...(isDark
          ? {}
          : {
              backgroundColor: "rgba(255,255,255,0.92)",
            }),
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const isSell = route.name === "sell";
        const IconComponent = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            className="flex-1 items-center justify-center py-2"
            onPress={onPress}
          >
            {isSell ? (
              <View className="items-center justify-center">
                <View className="h-8 w-14 items-center justify-center rounded-full bg-foreground">
                  <Icon
                    as={Plus}
                    className="size-5 text-background"
                    strokeWidth={2.5}
                  />
                </View>
                <Text className="mt-1 text-[11px] font-medium text-gray-400">
                  {label}
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center gap-[3px]">
                {IconComponent && (
                  <Icon
                    as={IconComponent}
                    className={
                      isFocused
                        ? "size-6 text-foreground"
                        : "size-6 text-gray-400"
                    }
                    strokeWidth={1.8}
                  />
                )}
                <Text
                  className={
                    isFocused
                      ? "text-[11px] font-medium text-foreground"
                      : "text-[11px] font-medium text-gray-400"
                  }
                >
                  {label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
