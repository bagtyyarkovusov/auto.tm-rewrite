import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useLargeText } from "@/lib/font-scale";
import { cn } from "@/lib/utils";

/**
 * The parts every filter in Search parameters is built from, so the form
 * reads as one thing: a bold name on the page, then one raised surface that
 * holds the filter's rows or its tonal fields.
 */

/**
 * The name of a filter, above its control. It is inset by 4 dp so it lines up
 * with where the rounded surface below it visually starts. `trailing` is a
 * short action for the whole filter, such as Clear.
 */
export function FilterLabel({ children, trailing }: { children: string; trailing?: ReactNode }) {
  return (
    <View className="min-h-6 flex-row items-center justify-between gap-3 px-1">
      <Text className="min-w-0 flex-1 text-callout font-semibold text-foreground" numberOfLines={2}>
        {children}
      </Text>
      {trailing}
    </View>
  );
}

/**
 * A "from" and a "to" field side by side on one raised surface, joined by a
 * short dash. The surface's 8 dp padding makes the fields' 16 dp corners
 * concentric with its 24 dp.
 */
export function FilterRange({ children, className }: { children: [ReactNode, ReactNode]; className?: string }) {
  const largeText = useLargeText();
  // Side by side, each field is too narrow for an amount at a large font
  // size, so the two stack and each takes the full width.
  if (largeText) {
    return (
      <View className={cn("gap-2 rounded-2xl bg-card p-2", className)}>
        <View className="flex-row">{children[0]}</View>
        <View className="flex-row">{children[1]}</View>
      </View>
    );
  }
  return (
    <View className={cn("flex-row items-center gap-2 rounded-2xl bg-card p-2", className)}>
      {children[0]}
      <View className="h-0.5 w-2 rounded-full bg-accent" />
      {children[1]}
    </View>
  );
}
