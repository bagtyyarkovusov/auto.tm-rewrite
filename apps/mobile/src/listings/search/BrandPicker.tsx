import { useMemo, type ReactNode } from "react";
import { Pressable, SectionList, View } from "react-native";
import { ChevronRight, History } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { ListingsSchemas } from "@auto-tm/contracts";

import type { BrandRow } from "./brandPickerLogic";
import { CarBrandLogo } from "./CarBrandLogo";
import type { PickerActions } from "./pickerActions";
import { useBrandPicker, type RecentRow } from "./useBrandPicker";

import { ErrorState } from "@/components/ErrorState";
import { StackHeader } from "@/components/navigation/StackHeader";
import { Button } from "@/components/ui/button";
import { GroupedItem } from "@/components/ui/grouped-list";
import { Icon } from "@/components/ui/icon";
import { GroupedListSkeleton, ListNote } from "@/components/ui/list-states";
import { SearchField } from "@/components/ui/search-field";
import { Text } from "@/components/ui/text";

interface BrandPickerProps {
  actions: PickerActions;
  /** The buyer's other filters; counts respect them. */
  filters?: ListingsSchemas.ListingFilter;
  /** Back (a pushed screen) or Close (inside Search parameters). */
  leading: ReactNode;
  /**
   * The space the list keeps clear after its last row. A pushed screen runs
   * under the floating tab bar and passes the bar's space; a sheet needs none.
   */
  bottomSpace?: number;
}

type Item =
  | { type: "recent"; row: RecentRow }
  | { type: "brand"; row: BrandRow };

interface Section {
  key: string;
  title: string;
  /** Recent has a Clear action in its heading. */
  clearable?: boolean;
  /** Printed above the first letter: "All brands A to Z". */
  intro?: string;
  data: Item[];
}

/**
 * The Brand picker (33 — Search & discovery): exactly one brand. A search
 * field in any spelling, then Recent (where it can open Results), Popular
 * with counts, and A to Z. Every row shows its logo or letter fallback.
 */
export function BrandPicker({ actions, filters, leading, bottomSpace = 0 }: BrandPickerProps) {
  const { t } = useTranslation();
  const picker = useBrandPicker({ filters, showRecent: !!actions.pickRecent });
  const { content } = picker;

  const sections = useMemo<Section[]>(() => {
    if (content.kind === "matches") {
      return content.rows.length > 0
        ? [
            {
              key: "matches",
              title: t("matchingBrands"),
              data: content.rows.map((row) => ({ type: "brand", row })),
            },
          ]
        : [];
    }
    if (content.kind !== "browse") return [];

    const result: Section[] = [];
    if (content.recent.length > 0) {
      result.push({
        key: "recent",
        title: t("recentChoices"),
        clearable: true,
        data: content.recent.map((row) => ({ type: "recent", row })),
      });
    }
    if (content.popular.length > 0) {
      result.push({
        key: "popular",
        title: t("popularBrands"),
        data: content.popular.map((row) => ({ type: "brand", row })),
      });
    }
    content.alphabet.forEach((letter, index) => {
      result.push({
        key: `letter-${letter.letter}`,
        title: letter.letter,
        ...(index === 0 ? { intro: t("allBrandsAtoZ") } : {}),
        data: letter.rows.map((row) => ({ type: "brand", row })),
      });
    });
    return result;
  }, [content, t]);

  const pick = (row: BrandRow) => actions.pickBrand({ id: row.id, name: row.name });

  let body: ReactNode;
  if (content.kind === "loading") {
    body = <GroupedListSkeleton rows={8} className="mt-4" accessibilityLabel={t("loadingEllipsis")} />;
  } else if (content.kind === "error") {
    body = <ErrorState error={content.error} onRetry={picker.retry} />;
  } else if (content.kind === "matches" && content.rows.length === 0) {
    body = content.searching ? (
      <GroupedListSkeleton rows={3} className="mt-4" accessibilityLabel={t("loadingEllipsis")} />
    ) : content.failed ? (
      <View className="px-4 py-4">
        <ErrorState error={content.error} onRetry={picker.retry} compact />
      </View>
    ) : (
      <ListNote>{t("noBrandsMatch")}</ListNote>
    );
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) =>
          item.type === "recent"
            ? `recent-${item.row.choice.brandId}-${item.row.choice.modelIds.join(",")}`
            : item.row.id
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        className="min-h-0 flex-1"
        contentContainerStyle={{ paddingBottom: bottomSpace + 24 }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View className="px-5 pb-2 pt-6">
            {section.intro ? (
              <Text className="pb-4 font-heading text-subhead font-semibold text-foreground">
                {section.intro}
              </Text>
            ) : null}
            <View className="min-h-6 flex-row items-center justify-between">
              <Text
                className={
                  section.key.startsWith("letter-")
                    ? "text-footnote font-semibold text-muted-foreground"
                    : "font-heading text-subhead font-semibold text-foreground"
                }
              >
                {section.title}
              </Text>
              {section.clearable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  // The heading row is 24 dp tall; the slop makes the target 44 dp.
                  className="-mr-2 h-6 px-2"
                  hitSlop={10}
                  onPress={picker.clearRecent}
                  accessibilityLabel={t("clearRecent")}
                >
                  <Text className="text-callout font-medium text-foreground">{t("clear")}</Text>
                </Button>
              ) : null}
            </View>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <GroupedItem index={index} count={section?.data.length}>
            {item.type === "recent" ? (
              <RecentItem
                row={item.row}
                onPress={() => actions.pickRecent?.(item.row.choice)}
              />
            ) : (
              <BrandItem row={item.row} onPress={() => pick(item.row)} />
            )}
          </GroupedItem>
        )}
        ListFooterComponent={
          <Text className="px-5 pt-5 text-caption text-muted-foreground">
            {t("brandLogosNotice")}
          </Text>
        }
      />
    );
  }

  return (
    <View className="min-h-0 flex-1">
      <StackHeader large title={t("brand")} leading={leading} />
      <View className="px-4 pb-1 pt-1">
        <SearchField
          value={picker.query}
          onChangeText={picker.setQuery}
          placeholder={t("searchBrandAnySpelling")}
          accessibilityLabel={t("searchBrandAnySpelling")}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>
      {body}
    </View>
  );
}

function BrandItem({ row, onPress }: { row: BrandRow; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-secondary"
    >
      <CarBrandLogo name={row.name} logoUrl={row.logoUrl} size={36} />
      <Text className="min-w-0 flex-1 text-body font-medium text-foreground" numberOfLines={1}>
        {row.name}
      </Text>
      {row.count !== undefined && row.count > 0 ? (
        <Text className="text-callout text-muted-foreground">{row.count}</Text>
      ) : null}
      <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
    </Pressable>
  );
}

function RecentItem({ row, onPress }: { row: RecentRow; onPress: () => void }) {
  const { t } = useTranslation();
  const label =
    row.choice.modelNames.length > 0
      ? `${row.brandName} ${row.choice.modelNames.join(", ")}`
      : t("brandAllModels", { brand: row.brandName });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-secondary"
    >
      <CarBrandLogo name={row.brandName} logoUrl={row.logoUrl} size={36} />
      <Text className="min-w-0 flex-1 text-body font-medium text-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Icon as={History} className="size-4 text-muted-foreground" />
    </Pressable>
  );
}
