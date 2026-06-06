import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
  View,
} from "react-native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useAuth } from "../../src/auth/useAuth";
import { useInfiniteMyListings } from "../../src/api/listings/useInfiniteMyListings";
import { useInfiniteMyDrafts } from "../../src/api/listings/useInfiniteMyDrafts";
import { useDiscardDraft } from "../../src/api/listings/useDiscardDraft";
import { useBrands } from "../../src/api/catalog/useBrands";
import { useModels } from "../../src/api/catalog/useModels";
import { OwnerListingCard } from "../../src/listings/components/OwnerListingCard";
import { DraftCard } from "../../src/listings/components/DraftCard";
import { SignInDialog } from "../../components/auth/SignInDialog";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

type ManageTab = "active" | "sold" | "archived" | "drafts";

const TABS: { key: ManageTab; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "sold", label: "Sold" },
  { key: "archived", label: "Archived" },
  { key: "drafts", label: "Drafts" },
];

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
  const copy: Record<ManageTab, { title: string; body: string; cta?: string }> = {
    active: {
      title: "No active listings",
      body: "List your first car and reach buyers today.",
      cta: "List a car",
    },
    sold: {
      title: "No sold listings",
      body: "Sold cars will appear here for 14 days.",
    },
    archived: {
      title: "No archived listings",
      body: "Archived listings are hidden from the public feed.",
    },
    drafts: {
      title: "No drafts",
      body: "Start a new listing and save it as a draft to continue later.",
      cta: "Start a draft",
    },
  };

  const current = copy[tab];

  return (
    <View className="items-center justify-center px-6 py-12">
      <Text className="text-lg font-semibold text-foreground">
        {current.title}
      </Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        {current.body}
      </Text>
      {current.cta && onCreate && (
        <Button
          variant="default"
          size="pill"
          className="mt-6"
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
  return (
    <View className="px-4 pb-3">
      <View className="flex-row rounded-lg bg-muted p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              className={`flex-1 items-center justify-center rounded-md py-1.5 ${
                isActive ? "bg-background shadow-sm" : ""
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
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ManageTab>("active");
  const [showSignIn, setShowSignIn] = useState(false);

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
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 pt-6 pb-3 flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
          <Text className="text-2xl font-semibold text-foreground">
            My listings
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-foreground">
            Sign in to manage your listings
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            View your active, sold, and archived listings, plus any saved drafts.
          </Text>
          <Button
            variant="default"
            size="pill"
            className="mt-6"
            onPress={() => setShowSignIn(true)}
          >
            <Text>Sign in</Text>
          </Button>
        </View>
        <SignInDialog
          actionLabel="Continue with phone"
          description="Sign in to manage your listings and drafts."
          open={showSignIn}
          returnPath="/listings/manage"
          title="Sign in required"
          onOpenChange={setShowSignIn}
        />
      </SafeAreaView>
    );
  }

  const isPending = isAuthenticated === null || currentQuery.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-6 pb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
          <Text className="text-2xl font-semibold text-foreground">
            My listings
          </Text>
        </View>
      </View>

      <SegmentedTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isListingsTab && filteredListings.length === 0 ? (
        <FlatList
          data={[]}
          keyExtractor={() => "empty"}
          renderItem={() => null}
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
                  No more
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
                  No more
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
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
