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

interface CatalogSection {
  id: string;
  title: string;
  items: CatalogItem[];
}

type SheetRow =
  | { kind: "header"; key: string; title: string }
  | { kind: "item"; key: string; item: CatalogItem };

function sheetRows(items: CatalogItem[], sections?: CatalogSection[]): SheetRow[] {
  if (!sections) return items.map((item) => ({ kind: "item", key: item.id, item }));
  return sections.flatMap((section): SheetRow[] => [
    { kind: "header", key: `header-${section.id}`, title: section.title },
    ...section.items.map((item): SheetRow => ({ kind: "item", key: item.id, item })),
  ]);
}

interface CatalogPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (text: string) => void;
  items: CatalogItem[];
  /** Groups the items under headers; when given, it replaces `items`. A section should not be empty. */
  sections?: CatalogSection[];
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
  sections,
  selectedId,
  emptyMessage,
  isLoading,
  isError,
  onSelect,
}: CatalogPickerSheetProps) {
  const { t } = useTranslation();
  const rows = sheetRows(items, sections);
  const isEmpty = !rows.some((row) => row.kind === "item");
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
        ) : isEmpty ? (
          <Text className="py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            className="min-h-0 flex-1"
            contentContainerClassName="pb-2"
            renderItem={({ item: row }) => {
              if (row.kind === "header") {
                return (
                  <Text
                    accessibilityRole="header"
                    className="px-2 pb-1 pt-4 text-sm font-medium text-muted-foreground"
                  >
                    {row.title}
                  </Text>
                );
              }
              const { item } = row;
              return (
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
              );
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
