import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

/** The row card (`ListingCard`) while it loads: the same raised surface, thumbnail and three lines. */
function SkeletonRow() {
  return (
    <View className="mx-4 flex-row gap-3 rounded-2xl bg-card p-2">
      <View className="aspect-photo w-32 shrink-0">
        <Skeleton className="h-full w-full rounded-lg" />
      </View>
      <View className="min-w-0 flex-1 justify-between py-1 pr-2">
        <View className="gap-0.5">
          <Skeleton className="my-1 h-4 w-1/2" />
          <Skeleton className="my-1 h-3 w-3/4" />
        </View>
        <Skeleton className="my-1 h-2.5 w-1/3" />
      </View>
    </View>
  );
}

const ROWS = [0, 1, 2, 3, 4];

export function FeedSkeleton() {
  return (
    <View className="flex-1 gap-3">
      {ROWS.map((row) => (
        <SkeletonRow key={row} />
      ))}
    </View>
  );
}
