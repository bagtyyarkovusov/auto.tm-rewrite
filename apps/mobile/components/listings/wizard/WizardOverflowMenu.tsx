import { Trash2 } from "lucide-react-native";
import { View } from "react-native";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";

interface WizardOverflowMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  children: React.ReactNode;
}

export function WizardOverflowMenu({
  open,
  onOpenChange,
  onDiscard,
  children,
}: WizardOverflowMenuProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <View className="gap-2">
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
