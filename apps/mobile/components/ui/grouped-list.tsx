import { Children, Fragment, type ReactNode } from "react";
import { View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * Rows on one raised surface, separated by inset dividers instead of lines
 * across the page (docs/prd/ui/components/78-04-list.md).
 *
 * `inset` is where the divider starts: `icon` clears a leading 32 to 40 dp
 * mark, `check` clears a checkbox, `text` starts at the row's text.
 */

type Inset = "icon" | "check" | "text";

const INSET: Record<Inset, string> = {
  icon: "ml-16",
  check: "ml-14",
  text: "ml-4",
};

function GroupedDivider({ inset = "icon" }: { inset?: Inset }) {
  return <View className={cn("h-px bg-border", INSET[inset])} />;
}

/** A short, non-virtualized group: wrap the rows and the dividers are added. */
function GroupedList({
  children,
  inset = "icon",
  className,
}: {
  children: ReactNode;
  inset?: Inset;
  className?: string;
}) {
  const rows = Children.toArray(children);
  return (
    <View className={cn("mx-4 overflow-hidden rounded-2xl bg-card", className)}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <GroupedDivider inset={inset} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * One row of a group inside a virtualized list: give it its place in the
 * section and it draws its share of the group's surface, corners and divider.
 * With no `count` (a list that does not report it) the row stands alone.
 */
function GroupedItem({
  index = 0,
  count = 1,
  inset = "icon",
  children,
}: {
  index?: number;
  count?: number;
  inset?: Inset;
  children: ReactNode;
}) {
  const first = index === 0;
  const last = index >= count - 1;
  return (
    <View
      className={cn(
        "mx-4 overflow-hidden bg-card",
        first && "rounded-t-2xl",
        last && "rounded-b-2xl",
      )}
    >
      {children}
      {last ? null : <GroupedDivider inset={inset} />}
    </View>
  );
}

export { GroupedDivider, GroupedItem, GroupedList };
