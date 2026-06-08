import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

import { useListingDetail } from "../../../src/api/listings/useListingDetail";
import { useCatalogMaps } from "../../../src/listings/detail/useCatalogMaps";
import { ListingDetailView } from "../../../src/listings/components/ListingDetail";
import { ContactCtaBar } from "../../../src/listings/components/ContactCtaBar";
import { useViewer } from "../../../src/auth/useViewer";
import { ReportSheet } from "../../../src/admin/components/ReportSheet";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

function DetailSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Photo skeleton */}
        <Skeleton className="h-[260px] w-full rounded-none" />

        <View className="px-5 py-4 gap-4">
          {/* Title skeleton */}
          <View className="gap-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
          </View>

          {/* Spec grid skeleton */}
          <View className="flex-row flex-wrap gap-y-2">
            <Skeleton className="h-10 w-[45%]" />
            <Skeleton className="h-10 w-[45%]" />
            <Skeleton className="h-10 w-[45%]" />
            <Skeleton className="h-10 w-[45%]" />
          </View>

          {/* Description skeleton */}
          <View className="gap-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </View>

          {/* Seller skeleton */}
          <View className="flex-row items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <View className="gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function UnavailableState({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-lg font-semibold text-foreground">
          This listing is no longer available
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          It may have been removed, sold, or archived.
        </Text>
        <View className="flex-row gap-3">
          <Button variant="outline" size="pill" onPress={() => router.back()}>
            <Text>Go back</Text>
          </Button>
          {onRetry && (
            <Button variant="default" size="pill" onPress={onRetry}>
              <Text className="text-primary-foreground">Retry</Text>
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, error, refetch } = useListingDetail(id ?? "");
  const viewer = useViewer();
  const [reportOpen, setReportOpen] = useState(false);

  const { maps } = useCatalogMaps(
    data?.brandId,
    data?.modelId,
    data?.regionId,
  );

  const isOwner =
    viewer != null && data != null && viewer.userId === data.sellerId;

  if (isPending) {
    return <DetailSkeleton />;
  }

  if (error || !data) {
    const isNotFound =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status?: number }).status === 404;
    return (
      <UnavailableState onRetry={isNotFound ? undefined : () => refetch()} />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      {/* Back button */}
      <View className="absolute left-4 top-safe-offset-2 z-10">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-background/80"
          onPress={() => router.back()}
        >
          <Icon as={ArrowLeft} className="size-5 text-foreground" />
        </Button>
      </View>

      <View className="flex-1">
        <ListingDetailView
          listing={data}
          maps={maps}
          isOwner={isOwner}
          onReport={() => setReportOpen(true)}
        />
      </View>

      {/* Buyer CTAs only for non-owners */}
      {!isOwner && (
        <View className="border-t border-border">
          <ContactCtaBar
            listingId={data.id}
            contactPhone={data.contactPhone}
            allowCalls={data.allowCalls}
            allowChat={data.allowChat}
            status={data.status}
          />
        </View>
      )}

      <ReportSheet
        targetType="listing"
        targetId={data.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </SafeAreaView>
  );
}
