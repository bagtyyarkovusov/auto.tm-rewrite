import { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import type { ListingsSchemas } from "@auto-tm/contracts";
import type { ComponentProps } from "react";

import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";

import { Text } from "@/components/ui/text";

type ListingMedia = ListingsSchemas.ListingMedia;
type ExpoImageStyle = ComponentProps<typeof Image>["style"];

/** Status strip across the bottom of a photo, e.g. "Sold" on a closed Listing. */
export function GalleryBanner({ label }: { label: string }) {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2">
      <Text className="text-body font-bold text-white" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * One Listing photo at a given size variant. Falls back to the original upload
 * when the variant is missing or fails to load.
 */
export function GalleryImage({
  item,
  variant,
  contentFit,
  style,
}: {
  item: ListingMedia;
  variant: "thumbnail" | "detail" | "fullscreen";
  contentFit: "cover" | "contain";
  style: ExpoImageStyle;
}) {
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const generatedUri = buildVariantUrl(item.key, variant);
  const sourceUri = useOriginalImage
    ? buildOriginalUrl(item.key)
    : item.variants[variant] || generatedUri;

  return (
    <Image
      source={{ uri: sourceUri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      onError={() => setUseOriginalImage(true)}
    />
  );
}
