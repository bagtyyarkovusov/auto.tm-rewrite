import { Check, X } from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export interface PickerOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A bottom sheet with a title, a close button and one radio row per option.
 * Picking a row reports the value and closes the sheet; the close button, a tap
 * outside and the Android back button close it without a change (the dialog
 * primitive handles the last two). Shared by the Language and Theme pickers.
 */
export function OptionPickerSheet<T extends string>({ open, onOpenChange, title, options, value, onChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: readonly PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { t } = useTranslation();
  // The iOS full-window overlay gives an auto-height sheet no room, so this one sets a height.
  const sheetHeight = Math.min(useWindowDimensions().height * 0.85, 120 + options.length * 56 + 24);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ height: sheetHeight }}>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle className="text-xl font-bold">{title}</SheetTitle>
          <Button variant="ghost" size="icon" onPress={() => onOpenChange(false)} accessibilityLabel={t("close")}>
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>
        <View accessibilityRole="radiogroup" accessibilityLabel={title}>
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked }}
                className="min-h-14 flex-row items-center justify-between gap-3 py-2 active:opacity-70"
                onPress={() => {
                  onChange(option.value);
                  onOpenChange(false);
                }}
              >
                <Text className="text-base text-foreground">{option.label}</Text>
                <View
                  className={cn(
                    "size-[22px] items-center justify-center rounded-full border-[1.5px]",
                    checked ? "border-primary bg-primary" : "border-muted-foreground",
                  )}
                >
                  {checked ? <Icon as={Check} className="size-3.5 text-primary-foreground" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </SheetContent>
    </Sheet>
  );
}
