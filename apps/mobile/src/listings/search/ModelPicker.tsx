import { useMemo, type ReactNode } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { showResultsCount } from "./showResultsCount";
import type { ModelRow } from "./modelPickerLogic";
import type { PickerActions } from "./pickerActions";
import { useModelPicker } from "./useModelPicker";

import { ErrorState } from "@/components/ErrorState";
import { HeaderTextAction, StackHeader } from "@/components/navigation/StackHeader";
import { StickyActionBar, useStickyActionBar } from "@/components/navigation/StickyActionBar";
import type { StickyBarContainer } from "@/components/navigation/tabBarHeight";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/ui/glass-button";
import { Checkbox } from "@/components/ui/checkbox";
import { GroupedItem } from "@/components/ui/grouped-list";
import { GroupedListSkeleton, ListNote } from "@/components/ui/list-states";
import { SearchField } from "@/components/ui/search-field";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  actions: PickerActions;
  brandId: string;
  brandName?: string;
  /** Models already ticked when the picker opens. */
  initialModelIds?: readonly string[];
  /** The buyer's other filters; counts respect them. */
  filters?: ListingsSchemas.ListingFilter;
  /** Back (a pushed screen) or Close (inside Search parameters). */
  leading: ReactNode;
  /**
   * What the picker's parent keeps clear below the action bar: a tab screen
   * ends above the tab bar (`inset`); a sheet reaches the screen's edge (`screen`).
   */
  barContainer?: StickyBarContainer;
}

interface Section {
  key: string;
  title: string;
  data: ModelRow[];
}

/**
 * The Model picker (33 — Search & discovery): any number of models, or none
 * for every model of the brand. From Home or Results it ends with "Show N
 * listings" and "More filters"; inside Search parameters it ends with "Done".
 */
export function ModelPicker({
  actions,
  brandId,
  brandName,
  initialModelIds,
  filters,
  leading,
  barContainer = "inset",
}: ModelPickerProps) {
  const { t, i18n } = useTranslation();
  const picker = useModelPicker({ brandId, brandName, initialModelIds, filters });
  const { content, selected } = picker;
  const ready = content.kind === "ready";
  const bar = useStickyActionBar(barContainer);

  const sections = useMemo<Section[]>(() => {
    if (content.kind !== "ready") return [];
    const result: Section[] = [];
    if (content.rows.popular.length > 0) {
      result.push({ key: "popular", title: t("popularModels"), data: content.rows.popular });
    }
    if (content.rows.others.length > 0) {
      result.push({ key: "others", title: t("otherModels"), data: content.rows.others });
    }
    return result;
  }, [content, t]);

  const countLabel =
    picker.countError
      ? t(actions.mode === "done" ? "done" : "showResults")
      : picker.count === undefined
      ? t("loadingEllipsis")
      : actions.mode === "done"
        ? t("doneWithCount", { count: picker.count })
        : showResultsCount(t, i18n.resolvedLanguage ?? i18n.language, picker.count);

  let body: ReactNode;
  if (content.kind === "loading") {
    body = <GroupedListSkeleton rows={8} leading="check" accessibilityLabel={t("loadingEllipsis")} />;
  } else if (content.kind === "error") {
    body = <ErrorState error={content.error} onRetry={picker.retry} />;
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        className="min-h-0 flex-1"
        contentContainerStyle={{ paddingBottom: bar.space + 8 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          picker.query.trim() ? null : (
            <GroupedItem inset="check">
              <ModelCheckRow
                name={t("allModels")}
                checked={selected.length === 0}
                onPress={picker.selectAll}
              />
            </GroupedItem>
          )
        }
        ListEmptyComponent={
          <ListNote>{t("noModelsMatch")}</ListNote>
        }
        renderSectionHeader={({ section }) => (
          <Text className="px-5 pb-2 pt-6 font-heading text-subhead font-semibold text-foreground">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <GroupedItem index={index} count={section?.data.length} inset="check">
            <ModelCheckRow
              name={item.name}
              count={item.count}
              checked={selected.includes(item.id)}
              onPress={() => picker.toggle(item.id)}
            />
          </GroupedItem>
        )}
      />
    );
  }

  return (
    <View className="min-h-0 flex-1">
      <StackHeader
        large
        title={picker.brandName ? t("modelsOfBrand", { brand: picker.brandName }) : t("model")}
        leading={leading}
        trailing={<HeaderTextAction label={t("changeBrand")} onPress={actions.changeBrand} />}
      />
      <View className="px-4 pb-3 pt-1">
        <SearchField
          value={picker.query}
          onChangeText={picker.setQuery}
          placeholder={t("searchModel")}
          accessibilityLabel={t("searchModel")}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>
      {/* The list runs under the bar; the bar floats at the bottom of this view. */}
      <View className="min-h-0 flex-1">
        {body}
        <StickyActionBar {...bar.barProps} edgeFade={barContainer === "inset"}>
          {actions.mode === "show" && selected.length === 0 && picker.brandName ? (
            <Text className="px-2 pt-1 text-center text-footnote text-muted-foreground">
              {t("noModelPickedHint", { brand: picker.brandName })}
            </Text>
          ) : null}
          {picker.countError ? (
            // In a sheet the bar has no edge fade, so the error gets the sheet's own surface behind it.
            <View accessibilityRole="alert" className={cn("gap-1", barContainer === "screen" && "rounded-2xl bg-popover pb-1 shadow-floating")}>
              <Text className="px-2 pt-1 text-center text-callout text-destructive">{t("failedToLoadListingCount")}</Text>
              <Button variant="ghost" onPress={picker.retry}>
                <Text>{t("retry")}</Text>
              </Button>
            </View>
          ) : null}
          <GlassButton
            tone="brand"
            disabled={!ready}
            onPress={() => actions.confirm(picker.choice())}
            accessibilityLabel={countLabel}
          >
            <Text numberOfLines={1}>{countLabel}</Text>
          </GlassButton>
          {actions.moreFilters ? (
            <Button
              variant="ghost"
              className="min-h-11 py-0"
              disabled={!ready}
              onPress={() => actions.moreFilters?.(picker.choice())}
            >
              <Text className="text-body font-medium text-foreground">{t("moreFilters")}</Text>
            </Button>
          ) : null}
        </StickyActionBar>
      </View>
    </View>
  );
}

function ModelCheckRow({
  name,
  count,
  checked,
  onPress,
}: {
  name: string;
  count?: number;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        className="min-h-14 flex-row items-center gap-4 px-4 py-3 active:bg-secondary"
      >
        <Checkbox checked={checked} pointerEvents="none" />
        <Text
          className={cn("min-w-0 flex-1 text-body text-foreground", checked && "font-medium")}
          numberOfLines={1}
        >
          {name}
        </Text>
        {count !== undefined && count > 0 ? (
          <Text className="text-callout text-muted-foreground">{count}</Text>
        ) : null}
      </Pressable>
    </>
  );
}
