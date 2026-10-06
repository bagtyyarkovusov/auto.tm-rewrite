import { Image } from "expo-image";
import { CameraOff, Car, Heart, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { View, type PressableProps, type ViewProps } from "react-native";

import { buildOriginalUrl, buildVariantUrl } from "../detail/buildVariantUrl";

import { Icon } from "@/components/ui/icon";
import { Pop } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { duration } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The pieces every Listing card puts in its photo frame: the photo itself,
 * the composition that stands in when there is none, the favorite heart and
 * the small chips that sit on the picture. One set, so the grid card, the
 * large card and the row card look like one family.
 */

interface ListingPhotoProps {
  /** The stored key of the photo; leave it out for a Listing with no photo. */
  mediaKey?: string;
  /** The localized "No photo" line under the placeholder. */
  emptyLabel: string;
  /** `compact` fits a thumbnail: a smaller mark and no line of text. */
  compact?: boolean;
}

/**
 * One Listing photo filling its frame. The list-size variant loads first and
 * the original upload replaces it when the variant is missing. The frame owns
 * the size, the radius and the tonal tone that shows while the picture loads.
 */
export function ListingPhoto({ mediaKey, emptyLabel, compact = false }: ListingPhotoProps) {
  const [original, setOriginal] = useState(false);

  if (!mediaKey) return <NoPhoto label={emptyLabel} compact={compact} />;

  return (
    <Image
      source={{ uri: original ? buildOriginalUrl(mediaKey) : buildVariantUrl(mediaKey, "list") }}
      className="h-full w-full"
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={duration.fast}
      onError={() => setOriginal(true)}
    />
  );
}

/**
 * A Listing without a photo: a car on a disc with a struck-out camera pinned
 * to it, and the reason in words below. It reads as "no picture of this car",
 * not as a picture that failed to load.
 */
function NoPhoto({ label, compact }: { label: string; compact: boolean }) {
  return (
    <View className="h-full w-full items-center justify-center gap-2">
      <View
        className={cn(
          "items-center justify-center rounded-full bg-accent",
          compact ? "size-10" : "size-12",
        )}
      >
        <Icon
          as={Car}
          className={cn("text-muted-foreground", compact ? "size-5" : "size-6")}
          strokeWidth={1.75}
        />
        {/* The ring is the frame's own tone, so the badge reads as cut into the disc. */}
        <View className="absolute -bottom-1 -right-1 size-5 items-center justify-center rounded-full border-2 border-secondary bg-card">
          <Icon as={CameraOff} className="size-2.5 text-muted-foreground" strokeWidth={2.4} />
        </View>
      </View>
      {compact ? null : (
        <Text className="px-2 text-center text-caption font-medium text-muted-foreground" numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

type PhotoFavoriteButtonProps = Omit<PressableProps, "children"> & {
  favorited: boolean;
  className?: string;
};

/**
 * The heart on a Listing photo. The target is 48 dp square in the photo's top
 * trailing corner; the mark inside is a 36 dp disc, which puts it concentric
 * with a card's 24 dp corner. Off, it is a white outline on the photo scrim;
 * saved, the disc turns white and the heart fills with the brand red, so the
 * state shows on a light photo and on a dark one. Saving swells the heart
 * once (`Pop`); Reduce Motion makes that an instant change.
 *
 * The caller passes the label, the handler and the accessibility state.
 */
export function PhotoFavoriteButton({ favorited, className, ...props }: PhotoFavoriteButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      className={cn("absolute right-0 top-0 h-12 w-12 items-center justify-center", className)}
      {...props}
    >
      <View
        className={cn(
          "size-9 items-center justify-center rounded-full",
          favorited ? "bg-media-foreground shadow-raised" : "bg-media-scrim/on-photo",
        )}
      >
        <Pop active={favorited}>
          <Icon
            as={Heart}
            className={
              favorited
                ? "size-5 text-brand-500 fill-brand-500"
                : "size-5 text-media-foreground"
            }
            strokeWidth={2}
          />
        </Pop>
      </View>
    </PressableScale>
  );
}

type PhotoChipProps = ViewProps & {
  label: string;
  icon?: LucideIcon;
  /** `scrim` sits on any photo; `solid` is the loud one, for a closed Listing; `quiet` is the raised surface. */
  tone?: "scrim" | "solid" | "quiet";
  className?: string;
};

/**
 * A small chip on a Listing photo: the photo count, or the state of a closed
 * Listing. It sizes to its text and keeps 8 dp of padding at each end.
 */
export function PhotoChip({ label, icon, tone = "scrim", className, ...props }: PhotoChipProps) {
  const foreground =
    tone === "scrim"
      ? "text-media-foreground"
      : tone === "solid"
        ? "text-background"
        : "text-foreground";
  return (
    <View
      className={cn(
        "absolute h-6 flex-row items-center gap-1 rounded-md px-2",
        tone === "scrim" && "bg-media-scrim/on-photo",
        tone === "solid" && "bg-foreground",
        tone === "quiet" && "bg-card",
        className,
      )}
      {...props}
    >
      {icon ? <Icon as={icon} className={cn("size-3", foreground)} strokeWidth={2.2} /> : null}
      <Text className={cn("text-caption font-medium", foreground)} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
