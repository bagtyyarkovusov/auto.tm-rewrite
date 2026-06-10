import { Check, X } from "lucide-react-native";
import { FlatList, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

interface CatalogItem {
  id: string;
  name: string;
}

interface CatalogPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (text: string) => void;
  items: CatalogItem[];
  selectedId?: string;
  emptyMessage: string;
  isLoading: boolean;
  isError: boolean;
  onSelect: (id: string) => void;
}

export function CatalogPickerSheet({
  open,
  onOpenChange,
  title,
  searchPlaceholder,
  search,
  onSearchChange,
  items,
  selectedId,
  emptyMessage,
  isLoading,
  isError,
  onSelect,
}: CatalogPickerSheetProps) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[85%]" style={{ height: "85%" }}>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>{title}</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Close"
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChangeText={onSearchChange}
          className="mb-2"
        />
        {isLoading ? (
          <View className="gap-3 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </View>
        ) : isError ? (
          <Text className="py-4 text-center text-sm text-destructive">
            {t("actionFailed")}
          </Text>
        ) : items.length === 0 ? (
          <Text className="py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            className="min-h-0 flex-1"
            contentContainerClassName="pb-2"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === selectedId }}
                className={`min-h-12 flex-row items-center justify-between rounded-md px-2 py-3 ${
                  item.id === selectedId ? "bg-muted" : ""
                }`}
              >
                <Text
                  className={`text-base ${item.id === selectedId ? "font-medium text-foreground" : "text-foreground"}`}
                >
                  {item.name}
                </Text>
                {item.id === selectedId && (
                  <Icon as={Check} className="size-4 text-primary" />
                )}
              </Pressable>
            )}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
