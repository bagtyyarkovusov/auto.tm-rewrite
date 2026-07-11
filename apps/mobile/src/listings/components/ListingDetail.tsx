import { ScrollView, View, Pressable } from "react-native";
import * as Linking from "expo-linking";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";
import { ChevronRight, Flag, ShieldCheck } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { CatalogMaps } from "../detail/useCatalogMaps";

import { PhotoGallery } from "./PhotoGallery";
import { PriceDisplay } from "./PriceDisplay";
import { SellerBlock } from "./SellerBlock";
import { OwnerActions } from "./OwnerActions";
import { InspectionInterestCta } from "./InspectionInterestCta";

import { resolveLocale } from "@/src/i18n/resources";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type ListingDetail = ListingsSchemas.ListingDetail;

interface ListingDetailProps {
  listing: ListingDetail;
  maps: CatalogMaps;
  isOwner?: boolean;
  onReport?: () => void;
  inspectionInterestEnabled?: boolean;
  inspectionInterestOpen?: boolean;
  onInspectionInterestOpenChange?: (open: boolean) => void;
}

function buildTitle(listing: ListingDetail, maps: CatalogMaps): string {
  const parts = [
    listing.year ? String(listing.year) : null,
    maps.brandName(listing.brandId) ?? listing.brandId,
    maps.modelName(listing.modelId) ?? listing.modelId,
    listing.generationId
      ? maps.generationName(listing.generationId) ?? listing.generationId
      : null,
  ].filter(Boolean);
  return parts.join(" ") || "";
}

interface SpecItemProps {
  label: string;
  value: string | undefined;
}

function SpecItem({ label, value }: SpecItemProps) {
  if (!value) return null;
  return (
    <View className="flex-1 min-w-[45%] gap-1 py-2">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  );
}

export function ListingDetailView({
  listing,
  maps,
  isOwner = false,
  onReport,
  inspectionInterestEnabled = true,
  inspectionInterestOpen = false,
  onInspectionInterestOpenChange,
}: ListingDetailProps) {
  const { t, i18n } = useTranslation();
  const isSold = listing.status === Enums.ListingStatus.Sold;

  const specs: SpecItemProps[] = [
    { label: t("year"), value: listing.year ? String(listing.year) : undefined },
    {
      label: t("condition"),
      value: listing.condition
        ? t(listing.condition === "new" ? "new" : "used")
        : undefined,
    },
    {
      label: t("mileage"),
      value:
        listing.mileageKm != null
          ? `${listing.mileageKm.toLocaleString(i18n.language)} ${t("km")}`
          : undefined,
    },
    {
      label: t("transmission"),
      value: listing.transmissionId
        ? maps.transmissionName(listing.transmissionId)
        : undefined,
    },
    {
      label: t("driveType"),
      value: listing.driveTypeId
        ? maps.driveTypeName(listing.driveTypeId)
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
      label: t("color"),
      value: listing.colorId ? maps.colorName(listing.colorId) : undefined,
    },
    {
      label: t("bodyType"),
      value: listing.bodyTypeId
        ? maps.bodyTypeName(listing.bodyTypeId)
        : undefined,
    },
    { label: t("vin"), value: listing.vin || undefined },
  ];

  const visibleSpecs = specs.filter((s) => s.value);

  return (
    <ScrollView className="flex-1">
      <PhotoGallery media={listing.media} />

      <View className="px-5 py-4 gap-3">
        {/* Title + status */}
        <View className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-2xl font-heading text-foreground flex-1">
              {buildTitle(listing, maps) || t("listing")}
            </Text>
            {isSold && (
              <Badge variant="secondary" className="px-2 py-0.5">
                <Text className="text-xs text-secondary-foreground">{t("sold")}</Text>
              </Badge>
            )}
          </View>
        </View>

        {/* Price */}
        <PriceDisplay
          displayPriceTmt={listing.displayPriceTmt}
          priceAmount={listing.priceAmount}
          priceCurrency={listing.priceCurrency}
          acceptsExchange={listing.acceptsExchange}
          installmentAvailable={listing.installmentAvailable}
          isOwner={isOwner}
        />

        {visibleSpecs.length > 0 && (
          <>
            <Separator className="my-1" />
            <View className="gap-1">
              <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("specifications")}
              </Text>
              <View className="flex-row flex-wrap">
                {visibleSpecs.map((spec) => (
                  <SpecItem key={spec.label} label={spec.label} value={spec.value} />
                ))}
              </View>
            </View>
          </>
        )}

        {listing.description && (
          <>
            <Separator className="my-1" />
            <View className="gap-1">
              <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("description")}
              </Text>
              <Text className="text-base text-foreground leading-5">
                {listing.description}
              </Text>
            </View>
          </>
        )}

        <Separator className="my-1" />

        <ConditionDisclosureSection disclosure={listing.conditionDisclosure} />

        <Separator className="my-1" />

        <VinHistorySection vin={listing.vin} vinHistory={listing.vinHistory} />

        <Separator className="my-1" />

        {/* Owner actions or seller block */}
        {isOwner ? (
          <OwnerActions listingId={listing.id} status={listing.status} />
        ) : (
          <SellerBlock
            cityName={maps.cityName(listing.cityId)}
            regionName={maps.regionName(listing.regionId)}
            locationText={listing.locationText}
            contactPhone={listing.contactPhone}
            allowCalls={listing.allowCalls}
            phoneVerified={listing.sellerTrust?.phoneVerified}
          />
        )}

        {/* Report button for non-owner active listings */}
        {!isOwner && listing.status === Enums.ListingStatus.Active && onReport && (
          <>
            <Separator className="my-1" />
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onPress={onReport}
            >
              <Icon as={Flag} className="size-4 text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">{t("report")}</Text>
            </Button>
          </>
        )}

        {/* Inspection interest fake-door for active listings */}
        {listing.status === Enums.ListingStatus.Active && (
          <>
            <Separator className="my-1" />
            <InspectionInterestCta
              listingId={listing.id}
              open={inspectionInterestOpen}
              onOpenChange={onInspectionInterestOpenChange ?? (() => {})}
              disabled={!inspectionInterestEnabled}
            />
          </>
        )}
      </View>

      <TrustInfoLink locale={resolveLocale(i18n.language)} />

      {/* Bottom padding for CTA or scroll breathing room */}
      <View className="h-4" />
    </ScrollView>
  );
}

function VinHistorySection({
  vin,
  vinHistory,
}: {
  vin: string | undefined;
  vinHistory: ListingsSchemas.ListingDetail["vinHistory"];
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("vinHistory")}
      </Text>
      <VinHistoryBody vin={vin} vinHistory={vinHistory} />
    </View>
  );
}

function VinHistoryBody({
  vin,
  vinHistory,
}: {
  vin: string | undefined;
  vinHistory: ListingsSchemas.ListingDetail["vinHistory"];
}) {
  const { t } = useTranslation();

  if (!vin) {
    return <Text className="text-base text-muted-foreground">{t("vinNotProvided")}</Text>;
  }

  if (!vinHistory || vinHistory.decoded === false) {
    return <Text className="text-base text-muted-foreground">{t("vinNotDecoded")}</Text>;
  }

  return (
    <View className="gap-1">
      {vinHistory.brand && <VinHistoryRow label={t("brand")} value={vinHistory.brand} />}
      {vinHistory.model && <VinHistoryRow label={t("model")} value={vinHistory.model} />}
      {vinHistory.year !== undefined && (
        <VinHistoryRow label={t("year")} value={String(vinHistory.year)} />
      )}
      {vinHistory.bodyType && <VinHistoryRow label={t("bodyType")} value={vinHistory.bodyType} />}
      {vinHistory.engineType && (
        <VinHistoryRow label={t("engineType")} value={vinHistory.engineType} />
      )}
      <Text className="text-sm text-muted-foreground">
        {t("vinConfidence", { value: Math.round(vinHistory.confidence * 100) })}
      </Text>
    </View>
  );
}

function VinHistoryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base text-foreground">{label}:</Text>
      <Text className="text-base font-medium text-foreground">{value}</Text>
    </View>
  );
}

function ConditionDisclosureSection({
  disclosure,
}: {
  disclosure: ListingsSchemas.ListingDetail["conditionDisclosure"];
}) {
  const { t } = useTranslation();

  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("conditionDisclosure")}
      </Text>
      {disclosure ? (
        <View className="gap-1">
          <DisclosureRow label={t("accidentReported")} value={disclosure.accidentReported} />
          <DisclosureRow label={t("mileageAccurate")} value={disclosure.mileageAccurate} />
          {disclosure.ownerCount !== undefined && (
            <Text className="text-base text-foreground">
              {t("ownerCountValue", { count: disclosure.ownerCount })}
            </Text>
          )}
          <DisclosureRow label={t("serviceHistoryAvailable")} value={disclosure.serviceHistoryAvailable} />
          {disclosure.knownIssuesText && (
            <View className="gap-0.5">
              <Text className="text-sm text-muted-foreground">{t("knownIssuesText")}</Text>
              <Text className="text-base text-foreground">{disclosure.knownIssuesText}</Text>
            </View>
          )}
        </View>
      ) : (
        <Text className="text-base text-muted-foreground">{t("noConditionDisclosure")}</Text>
      )}
    </View>
  );
}

function DisclosureRow({ label, value }: { label: string; value: boolean }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base text-foreground">{label}:</Text>
      <Text className={cn("text-base font-medium", value ? "text-foreground" : "text-muted-foreground")}>
        {value ? t("yes") : t("no")}
      </Text>
    </View>
  );
}

function TrustInfoLink({ locale }: { locale: string }) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => void Linking.openURL(`https://auto.tm/${locale}/trust`)}
      className="mx-5 flex-row items-center gap-3 rounded-2xl bg-muted p-3 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={t("trustInfoTitle")}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Icon as={ShieldCheck} className="size-5 text-primary" />
      </View>
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {t("trustInfoTitle")}
      </Text>
      <Icon as={ChevronRight} className="size-5 text-muted-foreground" />
    </Pressable>
  );
}
