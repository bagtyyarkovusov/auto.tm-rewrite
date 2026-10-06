import {
  Heart,
  MessageSquare,
  Plus,
  Search,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useUnreadCount } from "../../src/api/conversations/useUnreadCount";
import { queryKeys } from "../../src/api/queryKeys";
import { useRefreshUnreadOnPush } from "../../src/notifications/useRefreshUnreadOnPush";

import {
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING,
  TAB_BAR_SIDE_MARGIN,
  tabBarBottomOffset,
  tabSlotWidth,
} from "./tabBarHeight";

import { GlassSurface } from "@/components/ui/glass-surface";
import { Icon } from "@/components/ui/icon";
import { CrossFade, SlideIndicator } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * Tab labels do not grow past this with the system font size: the bar has a
 * fixed height, and a label that outgrew it would be cut. Long labels shrink
 * to their slot instead (`adjustsFontSizeToFit`).
 */
const LABEL_MAX_FONT_SCALE = 1.3;

function useTabConfig() {
  const { t } = useTranslation();
  // `fills`: the icon is drawn solid while its tab is selected. The magnifier
  // and the plus have no inside to fill, so they take a heavier stroke.
  return [
    { name: "(search)", label: t("search"), icon: Search, fills: false },
    { name: "favorites", label: t("favorites"), icon: Heart, fills: true },
    { name: "sell", label: t("sell"), icon: Plus, fills: false },
    { name: "chat", label: t("messages"), icon: MessageSquare, fills: true },
    { name: "services", label: t("cabinet"), icon: User, fills: true },
  ] as const;
}

/**
 * A tab's icon in its two drawings: a quiet outline, and the selected one,
 * filled where the shape has an inside and heavier where it does not. The
 * two cross-fade on the UI thread when the tab is chosen.
 */
function TabIcon({
  icon,
  fills,
  selected,
}: {
  icon: LucideIcon;
  fills: boolean;
  selected: boolean;
}) {
  return (
    <CrossFade
      active={selected}
      off={<Icon as={icon} size={24} strokeWidth={1.8} className="text-muted-foreground" />}
      on={
        <Icon
          as={icon}
          size={24}
          strokeWidth={fills ? 1.8 : 2.4}
          className={cn("text-foreground", fills && "fill-foreground")}
        />
      }
    />
  );
}

/**
 * The five-tab bar (ADR-0051), drawn as a floating capsule on the glass
 * surface. Tab screens run underneath it. The selected tab sits in a capsule
 * that slides between tabs, with a filled icon and a heavier label; Sell is
 * the brand-red action, level with its neighbours.
 * See docs/prd/ui/hifi/mobile-tabs-_layout.md.
 */
export function AutoTmTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const TAB_CONFIG = useTabConfig();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const unreadCount = useUnreadCount();
  useRefreshUnreadOnPush();
  const [barWidth, setBarWidth] = useState(0);

  const messagesFocused = state.routes[state.index]?.name === "chat";
  // The count also refreshes on foreground and push (see their hooks) and after
  // a Conversation is read; here, each time the Messages tab gains focus.
  useEffect(() => {
    if (messagesFocused) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.unreadCounts(),
      });
    }
  }, [messagesFocused, queryClient]);

  const currentRoute = state.routes[state.index];
  const currentDescriptor = currentRoute ? descriptors[currentRoute.key] : undefined;
  const tabBarStyle = currentDescriptor?.options
    ?.tabBarStyle as { display?: string } | undefined;

  if (tabBarStyle?.display === "none") {
    return <View style={{ height: 0 }} />;
  }

  const focusedName = currentRoute?.name;
  const focusedIndex = TAB_CONFIG.findIndex((tab) => tab.name === focusedName);
  const slot = tabSlotWidth(barWidth, TAB_CONFIG.length);

  return (
    // Absolute, so tab screens run underneath; they keep `useTabBarSpace()` clear.
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: TAB_BAR_SIDE_MARGIN + insets.left,
        right: TAB_BAR_SIDE_MARGIN + insets.right,
        bottom: tabBarBottomOffset(insets.bottom),
      }}
    >
      <GlassSurface
        accessibilityRole="tablist"
        // items-stretch, not items-center: with align-items:center each tab
        // Pressable sizes to its own content instead of filling the bar,
        // leaving every tab target below Android's 48dp minimum.
        className="flex-row items-stretch rounded-full"
        style={{ height: TAB_BAR_HEIGHT, paddingHorizontal: TAB_BAR_PADDING }}
        onLayout={(event: LayoutChangeEvent) =>
          setBarWidth(event.nativeEvent.layout.width)
        }
      >
        {slot > 0 && focusedIndex >= 0 ? (
          // The capsule is concentric with the bar: the same inset on every
          // side, and a full radius inside a full radius.
          <SlideIndicator
            index={focusedIndex}
            slot={slot}
            // Sell keeps its own red capsule, so the sliding one steps aside.
            visible={focusedName !== "sell"}
            pointerEvents="none"
            className="absolute"
            style={{
              left: TAB_BAR_PADDING,
              top: TAB_BAR_PADDING,
              bottom: TAB_BAR_PADDING,
            }}
          >
            <View className="flex-1 rounded-full bg-foreground/10" />
          </SlideIndicator>
        ) : null}

        {TAB_CONFIG.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;

          const isFocused = focusedName === tab.name;
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
          const badgeCount = tab.name === "chat" ? unreadCount : 0;
          const accessibilityLabel =
            badgeCount > 0
              ? t("messagesTabUnread", { count: badgeCount })
              : (descriptor?.options.tabBarAccessibilityLabel ?? tab.label);

          return (
            <PressableScale
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={accessibilityLabel}
              testID={descriptor?.options.tabBarButtonTestID}
              // The side padding is the room a label keeps from the capsule's edge.
              className="flex-1 items-center justify-center gap-0.5 px-1.5"
              onPress={onPress}
              onLongPress={onLongPress}
            >
              {/* Every tab draws its icon in the same 28 dp row, so the labels share one baseline. */}
              <View className="h-7 items-center justify-center">
                {isSell ? (
                  <View className="h-7 w-12 items-center justify-center rounded-full bg-primary">
                    <Icon
                      as={Plus}
                      className="text-primary-foreground"
                      size={20}
                      strokeWidth={2.6}
                    />
                  </View>
                ) : (
                  <View>
                    <TabIcon icon={tab.icon} fills={tab.fills} selected={isFocused} />
                    {badgeCount > 0 ? (
                      // Absolute, so the badge never changes the tab's size.
                      <View
                        testID="messages-tab-badge"
                        className="absolute -right-3 -top-1.5 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1"
                      >
                        <Text
                          className="text-micro font-semibold text-primary-foreground"
                          maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                // A long label (Russian, Turkmen, a large system font) shrinks
                // to its slot before it is cut.
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
                className={cn(
                  "self-stretch text-center text-micro",
                  isFocused
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </GlassSurface>
    </View>
  );
}
