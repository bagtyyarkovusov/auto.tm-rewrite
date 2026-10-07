import { SearchX, type LucideIcon } from "lucide-react-native";
import { View, type ViewProps } from "react-native";

import { GroupedList } from "@/components/ui/grouped-list";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The quiet states of a list inside a picker or a sheet, where a full
 * `EmptyState` composition would be too much: a keyboard is usually open and
 * the list is one search away from having rows again.
 */

type ListNoteProps = ViewProps & {
  /** The mark above the line; a struck-out magnifier by default, for "no match". */
  icon?: LucideIcon;
  children: string;
  className?: string;
};

/**
 * One line that says why a list has no rows, under a small tonal mark. It
 * sits near the top of the list's space, where the first row would be.
 */
function ListNote({ icon = SearchX, children, className, ...props }: ListNoteProps) {
  return (
    <View className={cn("items-center gap-3 px-8 py-10", className)} {...props}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="size-12 items-center justify-center rounded-full bg-secondary"
      >
        <Icon as={icon} className="size-6 text-muted-foreground" strokeWidth={1.8} />
      </View>
      <Text className="text-center text-body text-muted-foreground">{children}</Text>
    </View>
  );
}

type GroupedListSkeletonProps = {
  rows?: number;
  /** What leads each row: a round logo, a checkbox, or nothing. */
  leading?: "logo" | "check" | "none";
  /** Read to a screen reader in place of the rows. */
  accessibilityLabel?: string;
  className?: string;
};

/** Bar widths that differ from row to row, so the block reads as names, not as a table. */
const WIDTHS = ["w-2/5", "w-3/5", "w-1/3", "w-1/2", "w-2/5", "w-3/5", "w-1/3", "w-1/2"];

/**
 * A grouped list while it loads: the same raised surface, row height, leading
 * mark and inset dividers the rows will have, so nothing moves when they
 * arrive.
 */
function GroupedListSkeleton({
  rows = 6,
  leading = "logo",
  accessibilityLabel,
  className,
}: GroupedListSkeletonProps) {
  return (
    <View accessibilityLabel={accessibilityLabel}>
      <GroupedList
        inset={leading === "logo" ? "icon" : leading === "check" ? "check" : "text"}
        className={className}
      >
        {Array.from({ length: rows }, (_, row) => (
          <View
            key={row}
            className={cn(
              "min-h-14 flex-row items-center px-4",
              leading === "check" ? "gap-4" : "gap-3",
            )}
          >
            {leading === "logo" ? <Skeleton className="size-9 rounded-full" /> : null}
            {leading === "check" ? <Skeleton className="size-6 rounded-sm" /> : null}
            <Skeleton className={cn("h-3", WIDTHS[row % WIDTHS.length])} />
          </View>
        ))}
      </GroupedList>
    </View>
  );
}

export { GroupedListSkeleton, ListNote };
export type { GroupedListSkeletonProps, ListNoteProps };
