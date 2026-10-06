import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface MenuRowProps {
  label: string;
  onPress: () => void;
  /** A small grey icon before the label. */
  icon?: LucideIcon;
  /** Replaces the icon, such as the avatar on the large profile row. */
  lead?: ReactNode;
  /** A second line under the label. */
  sub?: string;
  /** The current value, shown at the end of the row. */
  value?: string;
  /** `link` shows the value as an action, such as Add on an empty Sign-in Method. */
  valueTone?: "default" | "link";
  chevron?: boolean;
  size?: "default" | "large";
  /** Ends a long label in "…" instead of wrapping, as on the Cabinet profile row. */
  singleLineLabel?: boolean;
  variant?: "default" | "danger";
}

/**
 * One menu row, as Cabinet and Profile list them: an icon in a tonal disc, the
 * label, an optional value and chevron. Rows sit inside a `MenuGroup`. Screen
 * readers read the label, then the second line and the value.
 */
export function MenuRow({
  label,
  onPress,
  icon,
  lead,
  sub,
  value,
  valueTone = "default",
  chevron = false,
  size = "default",
  singleLineLabel = false,
  variant = "default",
}: MenuRowProps) {
  const large = size === "large";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, sub, value].filter(Boolean).join(", ")}
      className={cn(
        "flex-row items-center gap-3 px-4 py-2.5 active:bg-secondary",
        large ? "min-h-20" : "min-h-14",
      )}
      onPress={onPress}
    >
      {lead ??
        (icon ? (
          <View className="size-9 items-center justify-center rounded-full bg-secondary">
            <Icon
              as={icon}
              className={cn("size-5", variant === "danger" ? "text-destructive" : "text-foreground")}
            />
          </View>
        ) : null)}
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={singleLineLabel ? 1 : undefined}
          className={cn(
            large ? "text-subhead font-semibold" : "text-body font-medium",
            variant === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </Text>
        {sub ? (
          <Text className="mt-0.5 text-footnote text-muted-foreground" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          numberOfLines={1}
          className={cn(
            "shrink text-callout",
            valueTone === "link" ? "text-info-600 dark:text-info-400" : "text-muted-foreground",
          )}
        >
          {value}
        </Text>
      ) : null}
      {chevron ? <Icon as={ChevronRight} className="size-5 text-muted-foreground opacity-60" /> : null}
    </Pressable>
  );
}

/**
 * A group of rows on one raised surface. Groups are separated by page, not by
 * lines; inside a group the rows are separated by an inset `MenuDivider`.
 */
export function MenuGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn("mx-4 overflow-hidden rounded-2xl bg-card", className)}>{children}</View>
  );
}

/** Divider between rows of a group, inset to where the label starts. */
export function MenuDivider() {
  return <View className="ml-16 h-px bg-border" />;
}

/** The space between two groups of rows. */
export function MenuGap() {
  return <View className="h-4" />;
}
