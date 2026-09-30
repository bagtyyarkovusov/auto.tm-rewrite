import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ApiError } from "../../../src/api/client";
import { useListings } from "../../../src/api/listings/useListings";
import { useListingCount } from "../../../src/api/listings/useListingCount";
import { useModels } from "../../../src/api/catalog/useModels";
import { useTransmissions } from "../../../src/api/catalog/useTransmissions";
import { useEngineTypes } from "../../../src/api/catalog/useEngineTypes";
import { useViewer } from "../../../src/auth/useViewer";
import { ListingLargeCard, ListingLargeCardSkeleton } from "../../../src/listings/feed/ListingLargeCard";
import { FeedEmpty } from "../../../src/listings/feed/FeedEmpty";
import { FeedError } from "../../../src/listings/feed/FeedError";
import { FilteredEmpty } from "../../../src/listings/feed/FilteredEmpty";
import { useFeedCatalogMaps } from "../../../src/listings/feed/useFeedCatalogMaps";
import { useFeedFavoriteReplay } from "../../../src/listings/feed/useFeedFavoriteReplay";
import { FilterSheet } from "../../../src/listings/search/FilterSheet";
import { ResultsHeader } from "../../../src/listings/search/ResultsHeader";
import { SortSheet } from "../../../src/listings/search/SortSheet";
import { ConditionSwitch } from "../../../src/listings/search/ConditionSwitch";
import { BrandModelCard } from "../../../src/listings/search/BrandModelCard";
import { FilterChipsRow, type ChipGroup } from "../../../src/listings/search/FilterChipsRow";
import { useListingFilters } from "../../../src/listings/search/useListingFilters";
import { readResultsRouteState, writeResultsRouteState, type ResultsRouteState } from "../../../src/listings/search/resultsRouteState";
import { HOME_HREF } from "../../../src/navigation/homeHref";
import { useSafeBack } from "../../../src/navigation/useSafeBack";

import { Text } from "@/components/ui/text";

/** Results keeps the applied query in search params and leaves its list mounted on Listing navigation. */
export default function ResultsScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack(HOME_HREF);
  const params = useLocalSearchParams<ResultsRouteState>();
  const routeState = readResultsRouteState(params);
  const routeKey = JSON.stringify(routeState);
  const previousRouteKey = useRef(routeKey);
  const [sheetOpen, setSheetOpen] = useState(params.openFilters === "1");
  const [sortOpen, setSortOpen] = useState(false);
  const filters = useListingFilters(routeState, (next) => router.setParams(writeResultsRouteState(next)));
  const { replace, commit } = filters;
  useEffect(() => {
    if (previousRouteKey.current !== routeKey) {
      previousRouteKey.current = routeKey;
      replace(JSON.parse(routeKey));
    }
  }, [routeKey, replace]);
  useEffect(() => {
    if (params.openFilters === "1") {
      setSheetOpen(true);
      router.setParams({ openFilters: undefined });
    }
  }, [params.openFilters]);

  const sort = filters.active.sort ?? "newest";
  const applied = useMemo(() => ({ ...filters.active, sort }), [filters.active, sort]);
  const viewer = useViewer();
  const returnTo = useMemo(() => ({ pathname: "/(tabs)/(search)/results" as const, params: writeResultsRouteState(applied) }), [applied]);
  useFeedFavoriteReplay(returnTo);
  const feed = useListings({ filters: applied, viewerId: viewer?.userId ?? null });
  const count = useListingCount({ filters: applied });
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];
  // Include a selected brand even when there are no matching Listings, so its names remain visible.
  const catalog = useFeedCatalogMaps(items, filters.active.brandId ? [filters.active.brandId] : []);
  const models = useModels(filters.active.brandId ?? "");
  const modelNames = (filters.active.modelIds ?? []).map((id) => models.data?.items.find((model) => model.id === id)?.name ?? t("loading"));
  const transmissions = useTransmissions();
  const engineTypes = useEngineTypes();
  const scrollY = useRef(0);
  const [floating, setFloating] = useState(false);
  const floated = useSharedValue(0);
  const floatingStyle = useAnimatedStyle(() => ({ opacity: floated.value, transform: [{ translateY: (1 - floated.value) * 12 }] }));
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    const next = scrollY.current > 180;
    setFloating((previous) => previous === next ? previous : next);
    floated.value = withTiming(next ? 1 : 0, { duration: 150 });
  }, [floated]);
  const reset = () => { filters.replace({ sort: "newest" }); router.setParams(writeResultsRouteState({ sort: "newest" })); };
  const remove = (group: ChipGroup) => commit(group === "city" ? { cityId: undefined } : group === "price" ? { priceMin: undefined, priceMax: undefined } : { yearMin: undefined, yearMax: undefined });
  const chips = <FilterChipsRow filters={applied} cityName={filters.active.cityId ? catalog.cityName(filters.active.cityId) : undefined} onOpen={() => setSheetOpen(true)} onRemove={remove} />;
  const header = <View>
    <View className="gap-3 px-4 pt-1 pb-2">
      <ConditionSwitch value={applied.condition} onChange={(condition) => commit({ condition })} />
      <BrandModelCard brandName={applied.brandId ? catalog.brandName(applied.brandId) : undefined} modelNames={modelNames} hasBrand={!!applied.brandId}
        onClear={() => commit({ brandId: undefined, modelIds: undefined, modelId: undefined })}
        onEdit={() => router.push(applied.brandId ? { pathname: "/(tabs)/(search)/models", params: { brandId: applied.brandId, modelIds: applied.modelIds?.join(","), returnToResults: "1", resultsState: JSON.stringify(writeResultsRouteState(applied)) } } : { pathname: "/(tabs)/(search)/brands", params: { returnToResults: "1", resultsState: JSON.stringify(writeResultsRouteState(applied)) } })} />
    </View>
    {chips}
  </View>;
  const offline = feed.fetchStatus === "paused" && items.length === 0;
  const empty = offline ? <FeedError error={new ApiError("NETWORK_ERROR", 0)} onRetry={() => void feed.refetch()} /> : feed.isPending ? <View accessibilityLabel={t("resultsLoading")} className="gap-2">{[0, 1, 2].map((id) => <ListingLargeCardSkeleton key={id} />)}</View>
    : feed.isError ? <FeedError error={feed.error} onRetry={() => void feed.refetch()} />
      : filters.count ? <FilteredEmpty onReset={reset} /> : <FeedEmpty />;
  return <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
    <ResultsHeader count={count.data} sort={sort} onSort={() => setSortOpen(true)} onBack={goBack} />
    <FlatList data={feed.isPending || feed.isError ? [] : items} keyExtractor={(item) => item.id} ListHeaderComponent={header} ListEmptyComponent={empty}
      contentContainerStyle={{ paddingBottom: 76, flexGrow: 1 }} onScroll={onScroll} scrollEventThrottle={16}
      renderItem={({ item }) => <ListingLargeCard listing={item} onPress={(id) => router.push(`/(public)/listings/${id}`)}
        brandName={catalog.brandName(item.brandId)} modelName={catalog.modelName(item.modelId)} cityName={catalog.cityName(item.cityId)}
        transmissionName={transmissions.data?.items.find((entry) => entry.id === item.transmissionId)?.name}
        engineTypeName={engineTypes.data?.items.find((entry) => entry.id === item.engineTypeId)?.name}
        isAuthenticated={viewer === undefined ? null : viewer !== null} returnTo={returnTo} />}
      ItemSeparatorComponent={() => <View className="h-2 bg-background" />}
      refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} />}
      onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage && !feed.isRefetching) void feed.fetchNextPage(); }} onEndReachedThreshold={0.5}
      ListFooterComponent={items.length && !feed.isPending && !feed.isError ? <View className="items-center py-4">{feed.isFetchingNextPage ? <ActivityIndicator /> : !feed.hasNextPage ? <Text className="text-xs text-muted-foreground">{t("noMore")}</Text> : null}</View> : null} />
    {floating ? <Animated.View style={floatingStyle} className="absolute bottom-0 left-0 right-0 border-t border-border bg-background">{chips}</Animated.View> : null}
    <FilterSheet open={sheetOpen} onOpenChange={setSheetOpen} filters={filters} />
    <SortSheet open={sortOpen} onOpenChange={setSortOpen} value={sort} onChange={(value) => commit({ sort: value })} />
  </SafeAreaView>;
}
