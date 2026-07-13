import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, List } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useAuth } from "../../src/auth/useAuth";
import { useInfiniteMyListings } from "../../src/api/listings/useInfiniteMyListings";
import { useInfiniteMyDrafts } from "../../src/api/listings/useInfiniteMyDrafts";
import { useDiscardDraft } from "../../src/api/listings/useDiscardDraft";
import { useBrands } from "../../src/api/catalog/useBrands";
import { useModels } from "../../src/api/catalog/useModels";
import { useSafeBack } from "../../src/navigation/useSafeBack";
import { OwnerListingCard } from "../../src/listings/components/OwnerListingCard";
import { DraftCard } from "../../src/listings/components/DraftCard";
import { SignInDialog } from "../../components/auth/SignInDialog";
import { useFeedCatalogMaps } from "../../src/listings/feed/useFeedCatalogMaps";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { SafeScreen } from "@/components/navigation/SafeScreen";
import { ErrorState } from "@/components/ErrorState";

type ManageTab = "active" | "sold" | "archived" | "drafts";

function useManageTabs(t: (key: string) => string): { key: ManageTab; label: string }[] {
  return [
    { key: "active", label: t("active") },
    { key: "sold", label: t("sold") },
    { key: "archived", label: t("archived") },
    { key: "drafts", label: t("drafts") },
  ];
}

const STATUS_MAP: Record<Exclude<ManageTab, "drafts">, string> = {
  active: Enums.ListingStatus.Active,
  sold: Enums.ListingStatus.Sold,
  archived: Enums.ListingStatus.Archived,
};

function EmptyState({
  tab,
  onCreate,
}: {
  tab: ManageTab;
  onCreate?: () => void;
}) {
  const { t } = useTranslation();

  const copy: Record<ManageTab, { title: string; body: string; cta?: string }> = {
    active: {
      title: t("noActiveListings"),
      body: t("beFirstToSell"),
      cta: t("listACar"),
    },
    sold: {
      title: t("noSoldListings"),
      body: t("soldCarsAppearHere"),
    },
    archived: {
      title: t("noArchivedListings"),
      body: t("archivedListingsHidden"),
    },
    drafts: {
      title: t("noDrafts"),
      body: t("startNewListing"),
      cta: t("startListing"),
    },
  };

  const current = copy[tab];

  return (
    <View className="items-center justify-center px-6 py-12 gap-4">
      <View className="size-16 items-center justify-center rounded-full bg-muted">
        <Icon as={List} className="size-8 text-muted-foreground" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-lg font-semibold text-foreground">
          {current.title}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {current.body}
        </Text>
      </View>
      {current.cta && onCreate && (
        <Button
          variant="default"
          size="pill"
          className="mt-2"
          onPress={onCreate}
        >
          <Text>{current.cta}</Text>
        </Button>
      )}
    </View>
  );
}

function SegmentedTabs({
  activeTab,
  onChange,
}: {
  activeTab: ManageTab;
  onChange: (tab: ManageTab) => void;
}) {
  const { t } = useTranslation();
  const tabs = useManageTabs(t);

  return (
    <View className="px-4 pb-3">
      <View className="flex-row rounded-lg bg-muted p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              // Keep the class shape stable between states: toggling a CSS-var
              // class (e.g. shadow-sm) onto a mounted component triggers a
              // css-interop upgrade that crashes the app in dev.
              className={`flex-1 items-center justify-center rounded-md border py-1.5 ${
                isActive
                  ? "border-border bg-background"
                  : "border-transparent bg-transparent"
              }`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ManageListingsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ManageTab>("active");
  const [showSignIn, setShowSignIn] = useState(false);
  const goBack = useSafeBack("/(tabs)/sell");

  const listingsQuery = useInfiniteMyListings({
    enabled: isAuthenticated === true,
  });
  const draftsQuery = useInfiniteMyDrafts({
    enabled: isAuthenticated === true,
  });
  const discardDraft = useDiscardDraft();

  const { data: brandsData } = useBrands();

  const allListings = useMemo(
    () => listingsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [listingsQuery.data],
  );
  const allDrafts = useMemo(
    () => draftsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [draftsQuery.data],
  );

  const filteredListings = useMemo(() => {
    if (activeTab === "drafts") return [];
    return allListings.filter((l) => l.status === STATUS_MAP[activeTab]);
  }, [allListings, activeTab]);

  const isListingsTab = activeTab !== "drafts";
  const currentQuery = isListingsTab ? listingsQuery : draftsQuery;

  const catalogMaps = useFeedCatalogMaps(filteredListings);

  const handleOpenListing = useCallback((id: string) => {
    router.push(`/(public)/listings/${id}`);
  }, []);

  const handleEditListing = useCallback((id: string) => {
    router.push(`/listings/${id}/edit`);
  }, []);

  const handleResumeDraft = useCallback((draft: ListingsSchemas.ListingDraft) => {
    router.push({
      pathname: "/(tabs)/sell",
      params: { resumeDraftId: draft.id },
    });
  }, []);

  const handleDiscardDraft = useCallback(
    (draftId: string) => {
      discardDraft.mutate(draftId);
    },
    [discardDraft],
  );

  const handleCreateListing = useCallback(() => {
    router.push("/(tabs)/sell");
  }, []);

  const handleRefresh = useCallback(() => {
    if (isListingsTab) {
      void listingsQuery.refetch();
    } else {
      void draftsQuery.refetch();
    }
  }, [isListingsTab, listingsQuery, draftsQuery]);

  const handleLoadMore = useCallback(() => {
    if (currentQuery.hasNextPage && !currentQuery.isFetchingNextPage) {
      void currentQuery.fetchNextPage();
    }
  }, [currentQuery]);

  // Auth-on-action: anonymous users see a sign-in prompt instead of an API error.
  if (isAuthenticated === false) {
    return (
      <SafeScreen>
        <View className="px-4 pb-3 flex-row items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 w-11"
            size="icon"
            onPress={goBack}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
          <Text className="text-2xl font-heading text-foreground">
            {t("myListings")}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-foreground">
            {t("signInToManage")}
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {t("manageYourListings")}
          </Text>
          <Button
            variant="default"
            size="pill"
            className="mt-6"
            onPress={() => setShowSignIn(true)}
          >
            <Text>{t("signIn")}</Text>
          </Button>
        </View>
        <SignInDialog
          actionLabel={t("continueWithPhone")}
          description={t("signInToManageDescription")}
          open={showSignIn}
          returnPath="/listings/manage"
          title={t("signInToManageTitle")}
          onOpenChange={setShowSignIn}
        />
      </SafeScreen>
    );
  }

  const isPending = isAuthenticated === null || currentQuery.isPending;

  return (
    <SafeScreen>
      {/* Header */}
      <View className="px-4 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 w-11"
            size="icon"
            onPress={goBack}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
          <Text className="text-2xl font-heading text-foreground">
            {t("myListings")}
          </Text>
        </View>
      </View>

      <SegmentedTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : currentQuery.isError ? (
        <ErrorState error={currentQuery.error} onRetry={handleRefresh} />
      ) : isListingsTab && filteredListings.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={() => "empty"}
          renderItem={() => null}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={currentQuery.isRefetching}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <EmptyState
              tab={activeTab}
              onCreate={activeTab === "active" ? handleCreateListing : undefined}
            />
          }
        />
      ) : !isListingsTab && allDrafts.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={() => "empty"}
          renderItem={() => null}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={currentQuery.isRefetching}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <EmptyState tab="drafts" onCreate={handleCreateListing} />
          }
        />
      ) : isListingsTab ? (
        <FlatList<ListingsSchemas.ListingSummary>
          data={filteredListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: ListingsSchemas.ListingSummary }) => (
            <OwnerListingCard
              listing={item}
              brandName={catalogMaps.brandName(item.brandId)}
              modelName={catalogMaps.modelName(item.modelId)}
              cityName={catalogMaps.cityName(item.cityId)}
              onOpen={handleOpenListing}
              onEdit={handleEditListing}
            />
          )}
          ItemSeparatorComponent={() => <Separator className="mx-4" />}
          refreshControl={
            <RefreshControl
              refreshing={currentQuery.isRefetching}
              onRefresh={handleRefresh}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            currentQuery.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : !currentQuery.hasNextPage ? (
              <View className="py-4 items-center">
                <Text className="text-xs text-muted-foreground">
                  {t("noMore")}
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList<ListingsSchemas.ListingDraft>
          data={allDrafts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: ListingsSchemas.ListingDraft }) => (
            <DraftCardWrapper
              draft={item}
              brandsData={brandsData}
              onResume={handleResumeDraft}
              onDiscard={handleDiscardDraft}
              isDiscarding={discardDraft.isPending}
            />
          )}
          ItemSeparatorComponent={() => <Separator className="mx-4" />}
          refreshControl={
            <RefreshControl
              refreshing={currentQuery.isRefetching}
              onRefresh={handleRefresh}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            currentQuery.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : !currentQuery.hasNextPage ? (
              <View className="py-4 items-center">
                <Text className="text-xs text-muted-foreground">
                  {t("noMore")}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeScreen>
  );
}

function DraftCardWrapper({
  draft,
  brandsData,
  onResume,
  onDiscard,
  isDiscarding,
}: {
  draft: ListingsSchemas.ListingDraft;
  brandsData:
    | { items: { id: string; name: string }[] }
    | undefined;
  onResume: (draft: ListingsSchemas.ListingDraft) => void;
  onDiscard: (draftId: string) => void;
  isDiscarding: boolean;
}) {
  const brandName = brandsData?.items.find(
    (b) => b.id === draft.payload.brandId,
  )?.name;

  const { data: modelsData } = useModels(draft.payload.brandId ?? "");
  const modelName = modelsData?.items.find(
    (m) => m.id === draft.payload.modelId,
  )?.name;

  return (
    <DraftCard
      draft={draft}
      brandName={brandName}
      modelName={modelName}
      onResume={onResume}
      onDiscard={onDiscard}
      isDiscarding={isDiscarding}
    />
  );
}
