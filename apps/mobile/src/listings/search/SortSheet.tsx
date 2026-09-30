import { ListingsSchemas } from "@auto-tm/contracts";
import { Check, X } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

export function SortSheet({ open, onOpenChange, value, onChange }: {
  open: boolean; onOpenChange: (open: boolean) => void;
  value: ListingsSchemas.FeedSort; onChange: (sort: ListingsSchemas.FeedSort) => void;
}) {
  const { t } = useTranslation();
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent>
      <SheetHeader className="flex-row items-center justify-between">
        <SheetTitle>{t("resultsSort")}</SheetTitle>
        <Button variant="ghost" size="icon" onPress={() => onOpenChange(false)} accessibilityLabel={t("close")}><Icon as={X} className="size-5 text-foreground" /></Button>
      </SheetHeader>
      <View accessibilityRole="radiogroup">
        {ListingsSchemas.FEED_SORT_VALUES.map((sort) => <Pressable key={sort}
          accessibilityRole="radio" accessibilityLabel={t(`resultsSort_${sort}`)} accessibilityState={{ checked: value === sort }}
          className="min-h-12 flex-row items-center justify-between py-3"
          onPress={() => { onChange(sort); onOpenChange(false); }}>
          <Text className="text-base text-foreground">{t(`resultsSort_${sort}`)}</Text>
          {value === sort ? <Icon as={Check} className="size-5 text-primary" /> : null}
        </Pressable>)}
      </View>
    </SheetContent>
  </Sheet>;
}
