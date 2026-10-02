import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { ArrowLeft, Heart, MoreHorizontal } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { ListingsSchemas } from "@auto-tm/contracts";

import { useAuth } from "../../auth/useAuth";
import { useListingFavorite } from "../useListingFavorite";
import { formatPrice } from "../formatPrice";

import { isClosedForContact } from "./closedListing";
import { listingTitle } from "./presentation";
import type { CatalogMaps } from "./useCatalogMaps";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  listing: ListingsSchemas.ListingDetail;
  maps: CatalogMaps;
  collapsed: boolean;
  topInset: number;
  onBack: () => void;
  onReport?: () => void;
  ownerMenu?: ReactNode;
}
export function CollapsingHeader({
  listing,
  maps,
  collapsed,
  topInset,
  onBack,
  onReport,
  ownerMenu,
}: Props) {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const favorite = useListingFavorite({
    listingId: listing.id,
    isFavorited: listing.isFavorited ?? false,
    isAuthenticated,
    returnTo: `/(public)/listings/${listing.id}`,
    replayAfterSignIn: true,
  });
  const closed = isClosedForContact(listing.status);
  const canReport = !closed && onReport !== undefined;
  return (
    <View
      className={cn(
        "absolute top-0 left-0 right-0 z-20",
        collapsed && "bg-background border-b border-border",
      )}
      style={{ paddingTop: topInset }}
    >
      <View className="flex-row items-center gap-1 px-3 py-2">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-background/90"
          accessibilityLabel={t("back")}
          onPress={onBack}
        >
          <Icon as={ArrowLeft} className="size-5 text-foreground" />
        </Button>
        <View className="min-w-0 flex-1 px-1">
          {collapsed && (
            <>
              <Text
                className={cn(
                  "text-sm font-bold",
                  closed ? "text-muted-foreground" : "text-foreground",
                )}
                numberOfLines={1}
              >
                {formatPrice(listing.displayPriceTmt, i18n.language)}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {listingTitle(listing, maps, false)}
              </Text>
            </>
          )}
        </View>
        {ownerMenu ?? (
          <>
            {!closed && (
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full bg-background/90"
                accessibilityLabel={t("favorite")}
                accessibilityState={{ selected: favorite.favorited }}
                disabled={favorite.pending || isAuthenticated === null}
                onPress={favorite.toggle}
              >
                {favorite.pending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Icon
                    as={Heart}
                    className={
                      favorite.favorited
                        ? "size-5 text-primary fill-primary"
                        : "size-5 text-foreground"
                    }
                  />
                )}
              </Button>
            )}
            {canReport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full bg-background/90"
                    accessibilityLabel={t("detailOptions")}
                  >
                    <Icon
                      as={MoreHorizontal}
                      className="size-5 text-foreground"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    accessibilityRole="button"
                    onPress={onReport}
                  >
                    <Text>{t("report")}</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </View>
    </View>
  );
}
