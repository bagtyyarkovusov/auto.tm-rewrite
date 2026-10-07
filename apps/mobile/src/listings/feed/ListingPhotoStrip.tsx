import { Enums } from "@auto-tm/contracts";
import { Camera } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { FlatList, Pressable, View, useWindowDimensions, type ListRenderItem } from "react-native";
import { useTranslation } from "react-i18next";

import { ListingPhoto, PhotoChip } from "./ListingPhoto";

import { Text } from "@/components/ui/text";
import { tabularFigures } from "@/lib/font";

/** The page margin either side of a Results card, in dp: none, the card spans the screen as on Auto.ru. */
export const CARD_INSET = 0;
/** The share of the card width one photo takes, so the next photo peeks in. */
export const STRIP_PHOTO_SHARE = 0.8;
/** The strip height as a share of the card width: a 4:3 photo at 80% of the width, about 240 dp on a 402 dp screen. */
export const STRIP_HEIGHT_SHARE = 0.6;
/** The seam between two photos (`gap-0.5`), in dp. */
export const STRIP_GAP = 2;

type Tile = { kind: "photo"; key: string } | { kind: "more"; count: number };

/** The tiles of a strip: every photo key in order, then "+N" when the Listing has more photos than keys. */
export function stripTiles(photoKeys: readonly string[], photoCount: number): Tile[] {
  const tiles: Tile[] = photoKeys.map((key) => ({ kind: "photo", key }));
  const more = photoCount - photoKeys.length;
  if (photoKeys.length > 0 && more > 0) tiles.push({ kind: "more", count: more });
  return tiles;
}

interface ListingPhotoStripProps {
  photoKeys: readonly string[];
  photoCount: number;
  /** The seller stated the car is new: a quiet chip says so on the photos. */
  condition?: Enums.ListingCondition;
  onOpen: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

/**
 * The photos at the top of a Results card, edge to edge. One photo fills the
 * frame. Two or more scroll sideways: each is 80% of the card wide so the
 * next one peeks in, they snap one photo per swipe, and a "+N photos" tile
 * ends the strip when the Listing has more photos than the feed sent. The
 * tile, like any photo, opens the Listing through its own tap target. The
 * scrolling container has no detail-opening press handler above it.
 *
 * The strip is a horizontal list inside the vertical Results list. A
 * horizontal scroll view only claims a drag that moves sideways, so a
 * vertical drag that starts on a photo still scrolls Results on iOS and on
 * Android; `nestedScrollEnabled` keeps Android from handing the gesture to
 * the outer list once the strip has taken it.
 *
 * The photo count and a seller-stated "New" sit on the photos' bottom edge,
 * fixed while the photos move under them; they take no touches.
 */
export function ListingPhotoStrip({ photoKeys, photoCount, condition, onOpen, onPressIn, onPressOut }: ListingPhotoStripProps) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - CARD_INSET * 2;
  const height = Math.round(cardWidth * STRIP_HEIGHT_SHARE);
  const photoWidth = Math.round(cardWidth * STRIP_PHOTO_SHARE);
  const tiles = useMemo(() => stripTiles(photoKeys, photoCount), [photoKeys, photoCount]);
  const interval = photoWidth + STRIP_GAP;

  const renderItem = useCallback<ListRenderItem<Tile>>(({ item }) => <Pressable
    accessible={false} onPress={onOpen} onPressIn={onPressIn} onPressOut={onPressOut}
  >{item.kind === "photo"
    ? <View testID="listing-photo" style={{ width: photoWidth, height }} className="overflow-hidden bg-secondary">
      <ListingPhoto mediaKey={item.key} emptyLabel={t("noPhotos")} variant="detail" />
    </View>
    : <View testID="listing-photo-more" style={{ width: photoWidth, height }} className="items-center justify-center gap-0.5 bg-secondary">
      <Text className="font-heading text-title font-semibold text-foreground" style={tabularFigures}>{`+${item.count}`}</Text>
      <Text className="text-footnote text-muted-foreground">{t("photos")}</Text>
    </View>}</Pressable>, [height, photoWidth, t, onOpen, onPressIn, onPressOut]);

  const chips = <View pointerEvents="none" className="absolute bottom-3 left-3 flex-row gap-1.5">
    {photoCount > 1 ? <PhotoChip icon={Camera} label={String(photoCount)} className="relative"
      accessibilityLabel={t("resultsPhotoCount", { count: photoCount })} /> : null}
    {condition === Enums.ListingCondition.New ? <PhotoChip label={t("new")} className="relative" /> : null}
  </View>;

  if (tiles.length < 2) {
    const only = tiles[0];
    // Every card keeps the strip's height, so a card without a photo lines up with its neighbours
    // and the list does not change rhythm; the frame's tone and the quiet mark say there is no picture.
    return <View testID="listing-photos" style={{ height }}>
      <Pressable accessible={false} onPress={onOpen} onPressIn={onPressIn} onPressOut={onPressOut}
        testID="listing-photo" className="h-full w-full overflow-hidden bg-secondary">
        <ListingPhoto mediaKey={only?.kind === "photo" ? only.key : undefined} emptyLabel={t("noPhotos")} variant="detail" />
      </Pressable>
      {chips}
    </View>;
  }

  return <View testID="listing-photos" style={{ height }}>
    <FlatList
      testID="listing-photo-strip"
      horizontal
      data={tiles}
      keyExtractor={(item) => item.kind === "photo" ? item.key : "more"}
      renderItem={renderItem}
      ItemSeparatorComponent={StripSeam}
      getItemLayout={(_, index) => ({ length: photoWidth, offset: interval * index, index })}
      snapToInterval={interval}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      initialNumToRender={3}
      maxToRenderPerBatch={2}
      windowSize={3}
    />
    {chips}
  </View>;
}

function StripSeam() {
  return <View className="w-0.5" />;
}
