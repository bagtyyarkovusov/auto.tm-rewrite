import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The part of Listing detail that always loads behind skeletons: specs,
 * description and seller. The deep-link skeleton and the card-seeded preview
 * both end with it.
 */
export function DetailSkeletonBody() {
  return (
    <View testID="detail-skeleton-body" className="gap-4">
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
  );
}

/** A deep link has no card to borrow from: a plain skeleton of the whole screen. */
export function DetailSkeleton({ bottomInset }: { bottomInset: number }) {
  return (
    <View
      testID="detail-skeleton"
      className="flex-1 bg-background"
      style={{ paddingBottom: bottomInset }}
    >
      {/* Photo skeleton, full-bleed to top edge */}
      <Skeleton className="h-[260px] w-full rounded-none" />

      <View className="px-5 py-4 gap-4">
        {/* Title skeleton */}
        <View className="gap-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
        </View>
        <DetailSkeletonBody />
      </View>
    </View>
  );
}
