import { ListingsSchemas } from "@auto-tm/contracts";
import { Check, X } from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

/**
 * The six sort orders as one radio list. The chosen order sits on a tonal row
 * with a brand check and a heavier label; the others are plain rows that take
 * the same tone under a finger. Rows run a little past the sheet's text edge,
 * so the highlight has room around the label.
 */
export function SortSheet({ open, onOpenChange, value, onChange }: {
  open: boolean; onOpenChange: (open: boolean) => void;
  value: ListingsSchemas.FeedSort; onChange: (sort: ListingsSchemas.FeedSort) => void;
}) {
  const { t } = useTranslation();
  // The iOS full-window overlay gives an auto-height sheet no room, so this one sets a height.
  const sheetHeight = Math.min(useWindowDimensions().height * 0.85, 456);
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent closeOnBackdropPress style={{ height: sheetHeight }}>
      <SheetHeader className="flex-row items-center justify-between">
        <SheetTitle>{t("resultsSort")}</SheetTitle>
        <Button variant="secondary" size="icon" onPress={() => onOpenChange(false)} accessibilityLabel={t("close")}><Icon as={X} className="size-5 text-foreground" /></Button>
      </SheetHeader>
      <View accessibilityRole="radiogroup" className="-mx-3 gap-0.5">
        {ListingsSchemas.FEED_SORT_VALUES.map((sort) => {
          const checked = value === sort;
          return <Pressable key={sort}
            accessibilityRole="radio" accessibilityLabel={t(`resultsSort_${sort}`)} accessibilityState={{ checked }}
            className={cn("min-h-control-md flex-row items-center justify-between gap-3 rounded-lg px-3 active:bg-secondary", checked && "bg-secondary")}
            onPress={() => { onChange(sort); onOpenChange(false); }}>
            <Text className={cn("min-w-0 flex-1 text-body text-foreground", checked && "font-semibold")} numberOfLines={1}>{t(`resultsSort_${sort}`)}</Text>
            {checked ? <Icon as={Check} className="size-5 text-primary" strokeWidth={2.4} /> : null}
          </Pressable>;
        })}
      </View>
    </SheetContent>
  </Sheet>;
}
