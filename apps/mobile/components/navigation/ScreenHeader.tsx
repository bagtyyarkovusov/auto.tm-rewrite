import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The title of a tab's first screen: large and heavy, in the heading face,
 * with room for a count beside it and header actions at the trailing edge.
 * A long title shrinks to fit before it truncates, so Russian and Turkmen
 * titles stay whole.
 */
export function LargeTitle({
  title,
  accessory,
  trailing,
  className,
  ...props
}: ViewProps & {
  title: string;
  /** Sits on the title's baseline, for example a count. */
  accessory?: ReactNode;
  /** Header actions, usually circular tonal icon buttons. */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn("flex-row items-center gap-3 px-5 pb-3 pt-2", className)}
      {...props}
    >
      <View className="min-w-0 flex-1 flex-row items-baseline gap-2">
        <Text
          className="shrink font-heading text-display font-bold text-foreground"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title}
        </Text>
        {accessory}
      </View>
      {trailing}
    </View>
  );
}

/**
 * The title of a group of content on a screen: bold, with an optional action
 * at the trailing edge.
 */
export function SectionHeader({
  title,
  trailing,
  className,
  ...props
}: ViewProps & { title: string; trailing?: ReactNode; className?: string }) {
  return (
    <View
      className={cn("min-h-11 flex-row items-center justify-between gap-3 px-5", className)}
      {...props}
    >
      <Text
        className="min-w-0 flex-1 font-heading text-headline font-semibold text-foreground"
        numberOfLines={1}
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}
