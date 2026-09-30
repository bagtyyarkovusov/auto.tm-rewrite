import { useCallback, useEffect, useRef, useState } from "react";
import type { TextInput} from "react-native";
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Calendar, ChevronLeft, ChevronRight, History, SlidersHorizontal, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { CatalogSchemas } from "@auto-tm/contracts";

import { useBrands } from "../../api/catalog/useBrands";
import { CATALOG_SEARCH_MIN_LENGTH, useCatalogSearch } from "../../api/catalog/useCatalogSearch";
import { useListingBrandCounts } from "../../api/listings/useListingBrandCounts";
import { HOME_HREF } from "../../navigation/homeHref";

import { buildBrandSections } from "./brandPickerLogic";
import { CarBrandLogo } from "./CarBrandLogo";
import { useRecentChoicesStore, type BrandModelChoice } from "./recentSearches";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

/** Search consumes catalog matches and parsed years; the API owns spelling and parsing. */
export function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const input = useRef<TextInput>(null);
  const brands = useBrands();
  const counts = useListingBrandCounts({});
  const search = useCatalogSearch(query);
  const recent = useRecentChoicesStore((state) => state.items);
  const hydrate = useRecentChoicesStore((state) => state.hydrate);
  const record = useRecentChoicesStore((state) => state.record);
  const clear = useRecentChoicesStore((state) => state.clear);
  useEffect(() => { void hydrate(); }, [hydrate]);
  useFocusEffect(useCallback(() => { input.current?.focus(); }, []));

  const brandMap = new Map(brands.data?.items.map((brand) => [brand.id, brand]));
  const popular = buildBrandSections(
    brands.data?.items ?? [],
    counts.data ? new Map(counts.data.items.map((item) => [item.brandId, item.totalMatching])) : undefined,
  ).popular;
  const empty = !query.trim();
  const enoughText = [...query.trim()].length >= CATALOG_SEARCH_MIN_LENGTH;
  // Previous data is useful in pickers, but cannot authorize a new Search selection.
  const waiting = search.isSettling || search.isPlaceholderData || (enoughText && search.isPending);
  const current = !waiting && enoughText ? search.data : undefined;
  const years = current?.yearFrom !== undefined
    ? current.yearFrom === current.yearTo
      ? String(current.yearFrom)
      : `${current.yearFrom}–${current.yearTo ?? current.yearFrom}`
    : undefined;

  const openResults = (choice?: BrandModelChoice, withYears = false) => {
    const params: Record<string, string> = {};
    if (choice) {
      params.brandId = choice.brandId;
      if (choice.modelIds.length) params.modelIds = choice.modelIds.join(",");
      void record(choice);
    }
    if (withYears && current) {
      if (current.yearFrom !== undefined) params.yearMin = String(current.yearFrom);
      if (current.yearTo !== undefined) params.yearMax = String(current.yearTo);
    }
    Keyboard.dismiss();
    router.replace({ pathname: "/(tabs)/(search)/results", params });
  };
  const pickMatch = (match: CatalogSchemas.CatalogSearchResultItem) => {
    if (!current) return;
    const brandName = match.kind === "brand" ? match.label : match.brandLabel ?? brandMap.get(match.brandId)?.name ?? match.brandId;
    openResults({ brandId: match.brandId, brandName,
      modelIds: match.kind === "model" && match.modelId ? [match.modelId] : [],
      modelNames: match.kind === "model" ? [match.label] : [],
    }, true);
  };
  const browseError = brands.isError ? brands.error : counts.isError ? counts.error : undefined;
  const browseLoading = !brands.data || !counts.data;
  const retryBrowse = () => { void brands.refetch(); void counts.refetch(); };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center gap-1 px-1 pt-2 pb-2">
        <Button variant="ghost" size="icon" className="h-11 w-11" accessibilityLabel={t("back")}
          onPress={() => { Keyboard.dismiss(); router.replace(HOME_HREF); }}>
          <Icon as={ChevronLeft} className="size-6 text-foreground" />
        </Button>
        <View className="min-w-0 flex-1">
          <Input ref={input} value={query} onChangeText={setQuery} autoFocus
            placeholder={t("searchBrandOrModel")} accessibilityLabel={t("searchBrandOrModel")}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" maxLength={100} />
        </View>
        {query ? <Button variant="ghost" size="icon" className="h-11 w-11"
          accessibilityLabel={t("clearSearch")} onPress={() => { setQuery(""); input.current?.focus(); }}>
          <Icon as={X} className="size-5 text-muted-foreground" />
        </Button> : <View className="w-3" />}
      </View>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="pb-6">
        {empty ? <>
          {recent.length > 0 ? <>
            <View className="flex-row items-center justify-between px-4 pt-2">
              <Text className="text-sm font-medium text-muted-foreground">{t("recentChoices")}</Text>
              <Button variant="ghost" size="sm" accessibilityLabel={t("clearRecent")} onPress={() => void clear()}>
                <Text className="text-sm text-primary">{t("clear")}</Text>
              </Button>
            </View>
            {recent.map((choice) => <SearchRow key={`${choice.brandId}-${choice.modelIds.join(",")}`}
              label={choice.modelNames.length ? `${choice.brandName} ${choice.modelNames.join(", ")}` : t("brandAllModels", { brand: choice.brandName })}
              leading={<CarBrandLogo name={choice.brandName} logoUrl={brandMap.get(choice.brandId)?.logoUrl} />}
              trailing={<Icon as={History} className="size-4 text-muted-foreground" />}
              onPress={() => openResults(choice)} />)}
          </> : null}
          <Text className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground">{t("popularBrands")}</Text>
          {browseError ? <ErrorState error={browseError} onRetry={retryBrowse} /> : browseLoading ? <Loading /> : popular.map((brand) =>
            <SearchRow key={brand.id} label={brand.name}
              leading={<CarBrandLogo name={brand.name} logoUrl={brand.logoUrl} />}
              detail={brand.count ? String(brand.count) : undefined}
              onPress={() => openResults({ brandId: brand.id, brandName: brand.name, modelIds: [], modelNames: [] })} />)}
        </> : waiting ? <Loading /> : search.isError && enoughText ?
          <ErrorState error={search.error} onRetry={() => void search.refetch()} /> : current?.results.length ? <>
            {current.results.map((match) => <SearchRow key={`${match.kind}-${match.brandId}-${match.modelId ?? ""}`}
              label={match.kind === "model" ? `${match.brandLabel ?? brandMap.get(match.brandId)?.name ?? match.brandId} ${match.label}` : match.label}
              leading={match.kind === "brand" ? <CarBrandLogo name={match.label} logoUrl={brandMap.get(match.brandId)?.logoUrl} /> : <View className="size-8" />}
              detail={years ?? (match.kind === "brand" ? t("brand") : undefined)} onPress={() => pickMatch(match)} />)}
          </> : years ? <SearchRow label={t("allCarsYear", { years })}
            leading={<Icon as={Calendar} className="size-8 text-muted-foreground" />} onPress={() => openResults(undefined, true)} /> :
          <Text className="px-6 py-8 text-center text-base text-muted-foreground">{t("noCatalogMatch", { query: query.trim() })}</Text>}
      </ScrollView>
      <View className="border-t border-border px-4 py-3">
        <Button variant="outline" onPress={() => { Keyboard.dismiss(); router.replace({ pathname: "/(tabs)/(search)/results", params: { openFilters: "1" } }); }}>
          <Icon as={SlidersHorizontal} className="size-5 text-foreground" /><Text>{t("allFilters")}</Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function Loading() {
  const { t } = useTranslation();
  return <View className="items-center py-8"><ActivityIndicator accessibilityLabel={t("loadingEllipsis")} /></View>;
}

function SearchRow({ label, leading, trailing, detail, onPress }: {
  label: string; leading: React.ReactNode; trailing?: React.ReactNode; detail?: string; onPress: () => void;
}) {
  return <Pressable onPress={onPress} accessibilityRole="button"
    className="min-h-14 flex-row items-center gap-3 px-4 py-2 active:bg-muted/60">
    {leading}<Text className="flex-1 text-base text-foreground" numberOfLines={1}>{label}</Text>
    {detail ? <Text className="text-sm text-muted-foreground">{detail}</Text> : null}
    {trailing ?? <Icon as={ChevronRight} className="size-4 text-muted-foreground" />}
  </Pressable>;
}
