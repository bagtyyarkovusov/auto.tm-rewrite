import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  View,
  type ViewToken,
} from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";


const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

type ListingMedia = ListingsSchemas.ListingMedia;
type ExpoImageStyle = ComponentProps<typeof Image>["style"];

interface PhotoGalleryProps {
  media: ListingMedia[];
}

function GalleryImage({
  item,
  variant,
  contentFit,
  style,
}: {
  item: ListingMedia;
  variant: "detail" | "fullscreen";
  contentFit: "cover" | "contain";
  style: ExpoImageStyle;
}) {
  const [useOriginalImage, setUseOriginalImage] = useState(false);
  const generatedUri = buildVariantUrl(item.key, variant);
  const sourceUri =
    useOriginalImage
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

export function PhotoGallery({ media }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      const first = info.viewableItems[0];
      if (first?.index != null) {
        setActiveIndex(first.index);
      }
    },
    [],
  );

  const onFullscreenViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[] }) => {
      const first = info.viewableItems[0];
      if (first?.index != null) {
        setFullscreenIndex(first.index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  if (media.length === 0) {
    return (
      <View className="h-[240px] w-full items-center justify-center bg-muted">
        <Text className="text-sm text-muted-foreground">{t("noPhotos")}</Text>
      </View>
    );
  }

  const renderItem = useCallback(
    ({ item, index }: { item: ListingMedia; index: number }) => {
      return (
        <Pressable
          onPress={() => setFullscreenIndex(index)}
          className="active:opacity-90"
        >
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 }}>
            <GalleryImage
              item={item}
              variant="detail"
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        </Pressable>
      );
    },
    [],
  );

  return (
    <View>
      <FlatList
        data={media}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Page indicator */}
      {media.length > 1 && (
        <View className="absolute bottom-2 left-0 right-0 flex-row items-center justify-center gap-1.5">
          {media.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${
                i === activeIndex
                  ? "w-3 bg-primary"
                  : "w-1.5 bg-foreground/40"
              }`}
            />
          ))}
        </View>
      )}

      {/* Fullscreen viewer */}
      <Modal
        visible={fullscreenIndex !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setFullscreenIndex(null)}
      >
        <View className="flex-1 bg-black">
          <FlatList
            data={media}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={fullscreenIndex ?? 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onViewableItemsChanged={onFullscreenViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => {
              return (
                <Pressable
                  onPress={() => setFullscreenIndex(null)}
                  className="flex-1 items-center justify-center"
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                >
                  <GalleryImage
                    item={item}
                    variant="fullscreen"
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 }}
                    contentFit="contain"
                  />
                </Pressable>
              );
            }}
          />

          {/* Close button */}
          <Pressable
            onPress={() => setFullscreenIndex(null)}
            className="absolute right-4 top-safe-offset-2 h-10 w-10 items-center justify-center rounded-full bg-black/50"
          >
            <Icon as={X} className="size-5 text-white" />
          </Pressable>

          {/* Fullscreen page indicator */}
          {media.length > 1 && (
            <View className="absolute bottom-safe-offset-2 left-0 right-0 flex-row items-center justify-center gap-1.5">
              {media.map((_, i) => (
                <View
                  key={i}
                  className={`h-1.5 rounded-full ${
                    i === (fullscreenIndex ?? 0)
                      ? "w-3 bg-white"
                      : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
