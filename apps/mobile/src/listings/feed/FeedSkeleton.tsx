import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

function SkeletonRow() {
  return (
    <View className="flex-row gap-3 px-4 py-3">
      <Skeleton className="h-[100px] w-[140px] rounded-lg" />
      <View className="flex-1 justify-between py-0.5">
        <View className="gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </View>
        <Skeleton className="h-3 w-1/3" />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View className="gap-1">
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}
