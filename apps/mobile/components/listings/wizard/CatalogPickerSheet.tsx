import { Check, CircleAlert, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ListNote } from "@/components/ui/list-states";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

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

function sheetRows(items: CatalogItem[] = [], sections?: CatalogSection[]): SheetRow[] {
  if (!sections) return items.map((item) => ({ kind: "item", key: item.id, item }));
  return sections.flatMap((section): SheetRow[] => [
    { kind: "header", key: `header-${section.id}`, title: section.title },
    ...section.items.map((item): SheetRow => ({ kind: "item", key: item.id, item })),
  ]);
}

/** Bar widths that differ from row to row, so the loading block reads as names. */
const SKELETON_WIDTHS = ["w-2/5", "w-3/5", "w-1/3", "w-1/2", "w-2/5", "w-3/5"];

interface CatalogPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (text: string) => void;
  /** The flat list. Leave it out when `sections` is given. */
  items?: CatalogItem[];
  /** Groups the items under headers; when given, it replaces `items`. A section should not be empty. */
  sections?: CatalogSection[];
  selectedId?: string;
  emptyMessage: string;
  isLoading: boolean;
  isError: boolean;
  onSelect: (id: string) => void;
  /** False for short fixed lists such as years, which need no keyboard. */
  searchable?: boolean;
  /** A last row under the list, such as "I don't know, skip". */
  footer?: ReactNode;
}

/**
 * One choice from a catalog list, in a sheet. The rows are the sheet's own
 * surface: the chosen row sits on the tonal tone with a brand check and a
 * heavier name, the same as the Sort sheet, and every row takes that tone
 * under a finger. Rows run a little past the sheet's text edge so the
 * highlight has room around the name.
 */
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
  searchable = true,
  footer,
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
            variant="secondary"
            size="icon"
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Close"
          >
            <Icon as={X} className="size-5 text-foreground" />
          </Button>
        </SheetHeader>
        {searchable && (
          <SearchField
            placeholder={searchPlaceholder}
            value={search}
            onChangeText={onSearchChange}
            autoCorrect={false}
          />
        )}
        {isLoading ? (
          <View className="gap-0.5">
            {SKELETON_WIDTHS.map((width, row) => (
              <View key={row} className="h-control-md justify-center">
                <Skeleton className={cn("h-3", width)} />
              </View>
            ))}
          </View>
        ) : isError ? (
          <ListNote icon={CircleAlert}>{t("actionFailed")}</ListNote>
        ) : isEmpty ? (
          <ListNote>{emptyMessage}</ListNote>
        ) : (
          <FlatList
            // One sheet serves several pickers; a new list per title starts at the top.
            key={title}
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            className="-mx-3 min-h-0 flex-1"
            contentContainerClassName="gap-0.5 pb-2"
            showsVerticalScrollIndicator={false}
            renderItem={({ item: row }) => {
              if (row.kind === "header") {
                return (
                  <Text
                    accessibilityRole="header"
                    className="px-3 pb-1 pt-4 text-footnote font-semibold text-muted-foreground"
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
                  className={cn(
                    "min-h-control-md flex-row items-center justify-between gap-3 rounded-lg px-3 py-2 active:bg-secondary",
                    item.id === selectedId && "bg-secondary",
                  )}
                >
                  <Text
                    className={cn(
                      "min-w-0 flex-1 text-body text-foreground",
                      item.id === selectedId && "font-semibold",
                    )}
                  >
                    {item.name}
                  </Text>
                  {item.id === selectedId && (
                    <Icon as={Check} className="size-5 text-primary" strokeWidth={2.4} />
                  )}
                </Pressable>
              );
            }}
          />
        )}
        {!isLoading && footer}
      </SheetContent>
    </Sheet>
  );
}
