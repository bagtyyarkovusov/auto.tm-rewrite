import { Trash2 } from "lucide-react-native";
import { View } from "react-native";

import {
  Sheet,
  SheetContent,
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
      <SheetContent style={{ height: 200 }}>
        <View className="h-[120px] justify-center">
          <Button
            variant="ghost"
            className="h-[52px] flex-row items-center justify-start gap-3 rounded-lg px-3"
            onPress={() => {
              onOpenChange(false);
              onDiscard();
            }}
          >
            <Icon as={Trash2} className="size-5 text-destructive" />
            <Text className="text-base text-destructive">Discard draft</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}
