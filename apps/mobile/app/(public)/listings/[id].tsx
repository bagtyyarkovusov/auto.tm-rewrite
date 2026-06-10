import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useListingDetail } from "../../../src/api/listings/useListingDetail";
import { useCatalogMaps } from "../../../src/listings/detail/useCatalogMaps";
import { useSafeBack } from "../../../src/navigation/useSafeBack";
import { ListingDetailView } from "../../../src/listings/components/ListingDetail";
import { ContactCtaBar } from "../../../src/listings/components/ContactCtaBar";
import { useViewer } from "../../../src/auth/useViewer";
import { useConfig } from "../../../src/api/admin/useConfig";
import { ReportSheet } from "../../../src/admin/components/ReportSheet";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";

function DetailSkeleton({ insets }: { insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      {/* Photo skeleton — full-bleed to top edge */}
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
  );
}

function UnavailableState({ onRetry, insets }: { onRetry?: () => void; insets: ReturnType<typeof useSafeAreaInsets> }) {
  const { t } = useTranslation();
  const goBack = useSafeBack();
  return (
    <View className="flex-1 bg-background items-center justify-center px-6 gap-4" style={{ paddingBottom: insets.bottom }}>
      <Text className="text-lg font-semibold text-foreground">
        {t("notAvailable")}
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        {t("removedSoldOrArchived")}
      </Text>
      <View className="flex-row gap-3">
        <Button variant="outline" size="pill" onPress={goBack}>
          <Text>{t("goBack")}</Text>
        </Button>
        {onRetry && (
          <Button variant="default" size="pill" onPress={onRetry}>
            <Text className="text-primary-foreground">{t("retry")}</Text>
          </Button>
        )}
      </View>
    </View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { data, isPending, error, refetch } = useListingDetail(id ?? "");
  const viewer = useViewer();
  const { data: config } = useConfig();
  const [reportOpen, setReportOpen] = useState(false);

  const { maps } = useCatalogMaps(
    data?.brandId,
    data?.modelId,
    data?.regionId,
  );

  const isOwner =
    viewer != null && data != null && viewer.userId === data.sellerId;

  if (isPending) {
    return <DetailSkeleton insets={insets} />;
  }

  if (error || !data) {
    const isNotFound =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status?: number }).status === 404;
    return (
      <UnavailableState onRetry={isNotFound ? undefined : () => refetch()} insets={insets} />
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Back button — positioned at safe-area top + 8px gap (HIG 44pt touch target) */}
      <View
        className="absolute left-4 z-10"
        style={{ top: insets.top + 8 }}
      >
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-background/80 h-11 w-11"
          onPress={goBack}
        >
          <Icon as={ArrowLeft} className="size-5 text-foreground" />
        </Button>
      </View>

      {/* Main content — bottom safe area only; photo goes full-bleed to top */}
      <View className="flex-1" style={{ paddingBottom: insets.bottom }}>
        <ListingDetailView
          listing={data}
          maps={maps}
          isOwner={isOwner}
          onReport={
            config?.reportEntryEnabled !== false
              ? () => setReportOpen(true)
              : undefined
          }
        />
      </View>

      {/* Buyer CTAs only for non-owners */}
      {!isOwner && (
        <View className="border-t border-border" style={{ paddingBottom: insets.bottom }}>
          <ContactCtaBar
            listingId={data.id}
            contactPhone={data.contactPhone}
            allowCalls={data.allowCalls}
            allowChat={data.allowChat}
            status={data.status}
            isFavorited={data.isFavorited ?? false}
          />
        </View>
      )}

      <ReportSheet
        targetType="listing"
        targetId={data.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </View>
  );
}
