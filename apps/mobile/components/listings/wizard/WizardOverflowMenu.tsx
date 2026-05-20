import { Trash2, X } from "lucide-react-native";
import { View } from "react-native";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

interface WizardOverflowMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

export function WizardOverflowMenu({
  open,
  onOpenChange,
  onDiscard,
}: WizardOverflowMenuProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Options</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Close"
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>

        <View className="gap-2 pt-2">
          <Button
            variant="ghost"
            className="h-[52px] justify-start gap-3 rounded-lg"
            onPress={() => {
              onOpenChange(false);
              onDiscard();
            }}
          >
            <Icon as={Trash2} className="size-5 text-error" />
            <Text className="text-base font-medium text-error">
              Discard draft
            </Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
