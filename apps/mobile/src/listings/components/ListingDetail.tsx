import { useState } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { ChevronRight, Flag } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { CatalogMaps } from "../detail/useCatalogMaps";
import {
  closedListingBannerKey,
  isClosedForContact,
} from "../detail/closedListing";
import { AskSellerChips } from "../detail/AskSellerChips";
import { listingTitle, detailDate } from "../detail/presentation";
import { ViewerFavorite } from "../detail/ViewerFavorite";

import { ContactCtaBar } from "./ContactCtaBar";
import { PhotoGallery } from "./PhotoGallery";
import { PriceDisplay } from "./PriceDisplay";
import { SellerBlock } from "./SellerBlock";

import { localeTag } from "@/src/i18n/resources";
import { useLargeText } from "@/lib/font-scale";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type ListingDetail = ListingsSchemas.ListingDetail;
interface ListingDetailProps {
  listing: ListingDetail;
  maps: CatalogMaps;
  isOwner?: boolean;
  onReport?: () => void;
  onSeeSimilar?: () => void;
  onScroll?: ScrollViewProps["onScroll"];
  onPhotoHeight?: (height: number) => void;
  /** Room kept at the end of the scroll for a bar that floats over it. */
  bottomSpace?: number;
}
interface SpecItemProps {
  label: string;
  value: string | undefined;
}
function SpecItem({ label, value }: SpecItemProps) {
  // Three columns break a value such as "120 000 km" across lines at a large
  // font size; two columns keep it whole.
  const largeText = useLargeText();
  if (!value) return null;
  return (
    <View className={cn(largeText ? "w-1/2" : "w-1/3", "gap-1 py-3 pr-2")}>
      <Text className="text-caption text-muted-foreground">{label}</Text>
      <Text className="text-callout font-semibold text-foreground">{value}</Text>
    </View>
  );
}
function SpecRow({ label, value }: SpecItemProps) {
  if (!value) return null;
  return (
    <View className="flex-row gap-3 py-1.5">
      <Text className="w-2/5 text-callout text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-callout text-foreground">{value}</Text>
    </View>
  );
}
export function ListingDetailView({
  listing,
  maps,
  isOwner = false,
  onReport,
  onSeeSimilar,
  onScroll,
  onPhotoHeight,
  bottomSpace = 0,
}: ListingDetailProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const closed = !isOwner && isClosedForContact(listing.status);
  const banner = closed ? closedListingBannerKey(listing.status) : null;
  // The viewer's ♡ and Call + Message follow the screen's own rules: not for
  // the owner, and not on a Listing closed for contact.
  const showViewerActions = !isOwner && !closed;
  const brandName = maps.brandName(listing.brandId);
  const modelName = maps.modelName(listing.modelId);
  const specs: SpecItemProps[] = [
    {
      label: t("year"),
      value: listing.year ? String(listing.year) : undefined,
    },
    {
      label: t("mileage"),
      value:
        listing.mileageKm != null
          ? `${listing.mileageKm.toLocaleString(localeTag(i18n.language))} ${t("km")}`
          : undefined,
    },
    {
      label: t("transmission"),
      value: listing.transmissionId
        ? maps.transmissionName(listing.transmissionId)
        : undefined,
    },
    {
      label: t("engineType"),
      value: listing.engineTypeId
        ? maps.engineTypeName(listing.engineTypeId)
        : undefined,
    },
    {
      label: t("enginePower"),
      value:
        listing.enginePower != null
          ? `${listing.enginePower} ${t("hp")}`
          : undefined,
    },
    {
      label: t("driveType"),
      value: listing.driveTypeId
        ? maps.driveTypeName(listing.driveTypeId)
        : undefined,
    },
  ];
  const rows: SpecItemProps[] = [
    {
      label: t("condition"),
      value: listing.condition
        ? t(listing.condition === "new" ? "new" : "used")
        : undefined,
    },
    {
      label: t("bodyType"),
      value: listing.bodyTypeId
        ? maps.bodyTypeName(listing.bodyTypeId)
        : undefined,
    },
    {
      label: t("color"),
      value: listing.colorId ? maps.colorName(listing.colorId) : undefined,
    },
    { label: t("vin"), value: listing.vin || undefined },
  ];
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: bottomSpace }}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View
        onLayout={(event) => onPhotoHeight?.(event.nativeEvent.layout.height)}
      >
        <PhotoGallery
          media={listing.media}
          banner={banner ? t(banner) : undefined}
          viewerHeaderAction={
            showViewerActions
              ? (close) => (
                  <ViewerFavorite
                    listingId={listing.id}
                    isFavorited={listing.isFavorited ?? false}
                    onBeforeSignIn={close}
                  />
                )
              : undefined
          }
          viewerFooter={
            showViewerActions
              ? (close) => (
                  <ContactCtaBar
                    variant="viewer"
                    replayAuth={false}
                    onBeforeMessage={close}
                    listingId={listing.id}
                    contactPhone={listing.contactPhone}
                    allowCalls={listing.allowCalls}
                    allowChat={listing.allowChat}
                    status={listing.status}
                  />
                )
              : undefined
          }
        />
      </View>
      <View className="gap-4 px-5 py-5">
        {isOwner && (
          <View className="gap-2 rounded-xl bg-muted p-4">
            <Text className="text-body font-semibold">
              {t("yourListing")} · {t(listing.status)}
            </Text>
            {/* Saves are counted by the API. Views are not counted yet, so no view figure is shown. */}
            <Text className="text-callout text-muted-foreground">
              {t("listingSaves", { count: listing.favoriteCount })}
            </Text>
          </View>
        )}
        <Text
          className="text-headline font-heading font-semibold text-foreground"
          numberOfLines={2}
        >
          {listingTitle(listing, maps) || t("listing")}
        </Text>
        <PriceDisplay
          displayPriceTmt={listing.displayPriceTmt}
          priceAmount={listing.priceAmount}
          priceCurrency={listing.priceCurrency}
          acceptsExchange={listing.acceptsExchange}
          installmentAvailable={listing.installmentAvailable}
          isOwner={isOwner}
          muted={closed}
        />
        <Text className="text-callout text-muted-foreground">
          {[
            detailDate(listing.publishedAt, i18n.language),
            maps.cityName(listing.cityId),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {closed && onSeeSimilar && brandName && modelName && (
          <Button variant="secondary" size="sm" onPress={onSeeSimilar}>
            <Text numberOfLines={1}>
              {t("seeOtherBrandModel", { brand: brandName, model: modelName })}
            </Text>
            <Icon as={ChevronRight} className="size-4" />
          </Button>
        )}
        {(specs.some((spec) => spec.value) ||
          rows.some((row) => row.value)) && (
          <View className="gap-1">
            <Separator className="mb-3" />
            <Text className="text-subhead font-semibold">{t("specifications")}</Text>
            <View className="flex-row flex-wrap">
              {specs.map((spec) => (
                <SpecItem key={spec.label} {...spec} />
              ))}
            </View>
            {rows.map((row) => (
              <SpecRow key={row.label} {...row} />
            ))}
          </View>
        )}
        {listing.description && (
          <View className="gap-2">
            <Separator className="mb-3" />
            <Text className="text-subhead font-semibold">{t("description")}</Text>
            <Text
              className="text-body leading-6"
              numberOfLines={expanded ? undefined : 3}
            >
              {listing.description}
            </Text>
            {!expanded && (
              <Button
                variant="link"
                size="sm"
                className="self-start px-0"
                onPress={() => setExpanded(true)}
              >
                <Text>{t("detailMore")}</Text>
              </Button>
            )}
          </View>
        )}
        {!isOwner && !closed && listing.allowChat && (
          <View className="gap-3">
            <Separator />
            <AskSellerChips
              listingId={listing.id}
              isOwner={isOwner}
              status={listing.status}
              allowChat={listing.allowChat}
            />
          </View>
        )}
        {listing.conditionDisclosure && (
          <View className="gap-3">
            <Separator />
            <ConditionDisclosureSection
              disclosure={listing.conditionDisclosure}
            />
          </View>
        )}
        {listing.vinHistory?.decoded === true && (
          <View className="gap-3">
            <Separator />
            <VinHistorySection vinHistory={listing.vinHistory} />
          </View>
        )}
        {!isOwner && (
          <View className="gap-3">
            <Separator />
            <SellerBlock
              seller={listing.seller}
              cityName={maps.cityName(listing.cityId)}
              locationText={listing.locationText}
            />
          </View>
        )}
        {!isOwner && listing.status === "active" && onReport && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onPress={onReport}
          >
            <Icon as={Flag} className="size-4 text-muted-foreground" />
            <Text className="text-muted-foreground">{t("report")}</Text>
          </Button>
        )}
        <Separator />
        <View className="gap-1 pb-5">
          <Text className="text-caption text-muted-foreground">
            {t("publicListingId", { id: listing.publicNumber })}
          </Text>
          <View className="flex-row gap-2">
            <Text className="text-caption text-muted-foreground">
              {t("detailPublished")}
            </Text>
            <Text className="text-caption text-muted-foreground">
              {detailDate(listing.publishedAt, i18n.language)}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Text className="text-caption text-muted-foreground">
              {t("updated")}
            </Text>
            <Text className="text-caption text-muted-foreground">
              {detailDate(listing.updatedAt, i18n.language)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
function VinHistorySection({
  vinHistory,
}: {
  vinHistory: Extract<
    NonNullable<ListingDetail["vinHistory"]>,
    { decoded: true }
  >;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      <Text className="text-subhead font-semibold">{t("vinHistory")}</Text>
      {vinHistory.brand && (
        <VinHistoryRow label={t("brand")} value={vinHistory.brand} />
      )}
      {vinHistory.model && (
        <VinHistoryRow label={t("model")} value={vinHistory.model} />
      )}
      {vinHistory.year !== undefined && (
        <VinHistoryRow label={t("year")} value={String(vinHistory.year)} />
      )}
      {vinHistory.bodyType && (
        <VinHistoryRow label={t("bodyType")} value={vinHistory.bodyType} />
      )}
      {vinHistory.engineType && (
        <VinHistoryRow label={t("engineType")} value={vinHistory.engineType} />
      )}
      <Text className="text-callout text-muted-foreground">
        {t("vinConfidence", { value: Math.round(vinHistory.confidence * 100) })}
      </Text>
    </View>
  );
}
function VinHistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Text className="text-body text-foreground">{label}:</Text>
      <Text
        className="min-w-0 flex-1 text-body font-medium text-foreground"
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/** ADR-0052: the seller's own statement; renders nothing without an answer. */
function ConditionDisclosureSection({
  disclosure,
}: {
  disclosure: ListingsSchemas.ListingDetail["conditionDisclosure"];
}) {
  const { t } = useTranslation();
  if (!disclosure) return null;

  return (
    <View className="gap-1">
      <Text className="text-callout font-semibold uppercase tracking-wide text-muted-foreground">
        {t("conditionAsStatedBySeller")}
      </Text>
      <View className="flex-row items-start gap-2">
        <Text className="text-body text-foreground">{t("damaged")}:</Text>
        <Text
          className={cn(
            "min-w-0 flex-1 text-body font-medium",
            disclosure.damaged ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {disclosure.damaged ? t("yes") : t("no")}
        </Text>
      </View>
      {disclosure.knownIssuesText && (
        <View className="gap-0.5">
          <Text className="text-callout text-muted-foreground">
            {t("knownIssuesText")}
          </Text>
          <Text className="text-body text-foreground">
            {disclosure.knownIssuesText}
          </Text>
        </View>
      )}
    </View>
  );
}
