import { useMemo, type ReactNode } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { ListingsSchemas } from "@auto-tm/contracts";

import type { ModelRow } from "./modelPickerLogic";
import type { PickerActions } from "./pickerActions";
import { useModelPicker } from "./useModelPicker";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { GroupedItem } from "@/components/ui/grouped-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

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
}: ModelPickerProps) {
  const { t } = useTranslation();
  const picker = useModelPicker({ brandId, brandName, initialModelIds, filters });
  const { content, selected } = picker;
  const ready = content.kind === "ready";

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
        : t("showResultsCount", { count: picker.count });

  let body: ReactNode;
  if (content.kind === "loading") {
    body = (
      <View className="gap-3 px-4 py-2" accessibilityLabel={t("loadingEllipsis")}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </View>
    );
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
        contentContainerClassName="pb-4"
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
          <Text className="px-4 py-8 text-center text-body text-muted-foreground">
            {t("noModelsMatch")}
          </Text>
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
      <View className="flex-row items-center gap-3 px-4 pt-1 pb-3">
        {leading}
        <Text className="min-w-0 flex-1 text-headline font-heading font-semibold text-foreground" numberOfLines={1}>
          {picker.brandName ? t("modelsOfBrand", { brand: picker.brandName }) : t("model")}
        </Text>
        <Button variant="ghost" className="h-11 px-3 py-0" onPress={actions.changeBrand}>
          <Text className="text-body font-medium text-primary">{t("changeBrand")}</Text>
        </Button>
      </View>
      <View className="px-4 pb-3">
        <Input
          value={picker.query}
          onChangeText={picker.setQuery}
          placeholder={t("searchModel")}
          accessibilityLabel={t("searchModel")}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>
      {body}
      <View className="gap-2 px-4 pb-2 pt-3">
        {actions.mode === "show" && selected.length === 0 && picker.brandName ? (
          <Text className="text-center text-callout text-muted-foreground">
            {t("noModelPickedHint", { brand: picker.brandName })}
          </Text>
        ) : null}
        {picker.countError ? (
          <View accessibilityRole="alert" className="gap-1">
            <Text className="text-center text-callout text-destructive">{t("failedToLoadListingCount")}</Text>
            <Button variant="ghost" onPress={picker.retry}>
              <Text>{t("retry")}</Text>
            </Button>
          </View>
        ) : null}
        <Button
          variant="brand"
          size="pill"
          disabled={!ready}
          onPress={() => actions.confirm(picker.choice())}
          accessibilityLabel={countLabel}
        >
          <Text numberOfLines={1}>{countLabel}</Text>
        </Button>
        {actions.moreFilters ? (
          <Button
            variant="ghost"
            className="h-11 py-0"
            disabled={!ready}
            onPress={() => actions.moreFilters?.(picker.choice())}
          >
            <Text className="text-body font-medium text-primary">{t("moreFilters")}</Text>
          </Button>
        ) : null}
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
        <Text className="flex-1 text-body text-foreground" numberOfLines={1}>
          {name}
        </Text>
        {count !== undefined && count > 0 ? (
          <Text className="text-callout text-muted-foreground">{count}</Text>
        ) : null}
      </Pressable>
    </>
  );
}
