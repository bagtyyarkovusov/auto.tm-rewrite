import {
  Heart,
  LayoutGrid,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const TAB_CONFIG = [
  { name: "index", label: "Search", icon: Search },
  { name: "favorites", label: "Favorites", icon: Heart },
  { name: "sell", label: "Sell", icon: Plus },
  { name: "chat", label: "Chat", icon: MessageSquare },
  { name: "services", label: "Services", icon: LayoutGrid },
] as const;

export function AutoTmTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center border-t border-border bg-background/90"
      style={{
        paddingBottom: insets.bottom,
        height: 64 + insets.bottom,
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) return null;

        const isFocused = state.routes[state.index]?.name === tab.name;
        const descriptor = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate(route.name, route.params),
              target: state.key,
            });
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const isSell = tab.name === "sell";

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={
              descriptor?.options.tabBarAccessibilityLabel ?? tab.label
            }
            testID={descriptor?.options.tabBarButtonTestID}
            className="flex-1 items-center justify-center"
            onPress={onPress}
            onLongPress={onLongPress}
          >
            {isSell ? (
              <View className="items-center justify-center gap-0">
                <View
                  className="items-center justify-center rounded-full bg-foreground"
                  style={{ width: 56, height: 32 }}
                >
                  <Icon
                    as={Plus}
                    className="text-background"
                    size={20}
                    strokeWidth={2}
                  />
                </View>
                <Text
                  className={cn(
                    "mt-1 text-[11px] font-medium",
                    isFocused ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center gap-[3px]">
                <Icon
                  as={tab.icon}
                  size={24}
                  strokeWidth={1.8}
                  className={isFocused ? "text-foreground" : "text-muted-foreground"}
                />
                <Text
                  className={cn(
                    "text-[11px] font-medium",
                    isFocused ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
