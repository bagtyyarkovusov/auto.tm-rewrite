import { ScrollView, View } from "react-native";
import { Enums } from "@auto-tm/contracts";
import type { ListingsSchemas } from "@auto-tm/contracts";


import type { CatalogMaps } from "../detail/useCatalogMaps";

import { PhotoGallery } from "./PhotoGallery";
import { PriceDisplay } from "./PriceDisplay";
import { SellerBlock } from "./SellerBlock";

import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type ListingDetail = ListingsSchemas.ListingDetail;

interface ListingDetailProps {
  listing: ListingDetail;
  maps: CatalogMaps;
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
  return parts.join(" ") || "Listing";
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

export function ListingDetailView({ listing, maps }: ListingDetailProps) {
  const isSold = listing.status === Enums.ListingStatus.Sold;

  const specs: SpecItemProps[] = [
    { label: "Year", value: listing.year ? String(listing.year) : undefined },
    {
      label: "Condition",
      value: listing.condition
        ? listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)
        : undefined,
    },
    {
      label: "Mileage",
      value:
        listing.mileageKm != null
          ? `${listing.mileageKm.toLocaleString("en-US")} km`
          : undefined,
    },
    {
      label: "Transmission",
      value: listing.transmissionId
        ? maps.transmissionName(listing.transmissionId)
        : undefined,
    },
    {
      label: "Drive type",
      value: listing.driveTypeId
        ? maps.driveTypeName(listing.driveTypeId)
        : undefined,
    },
    {
      label: "Engine",
      value: listing.engineTypeId
        ? maps.engineTypeName(listing.engineTypeId)
        : undefined,
    },
    {
      label: "Power",
      value:
        listing.enginePower != null
          ? `${listing.enginePower} hp`
          : undefined,
    },
    {
      label: "Color",
      value: listing.colorId ? maps.colorName(listing.colorId) : undefined,
    },
    {
      label: "Body type",
      value: listing.bodyTypeId
        ? maps.bodyTypeName(listing.bodyTypeId)
        : undefined,
    },
    { label: "VIN", value: listing.vin || undefined },
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
              {buildTitle(listing, maps)}
            </Text>
            {isSold && (
              <Badge variant="secondary" className="px-2 py-0.5">
                <Text className="text-xs text-secondary-foreground">Sold</Text>
              </Badge>
            )}
          </View>
        </View>

        {/* Price */}
        <PriceDisplay
          displayPriceTmt={listing.displayPriceTmt}
          acceptsExchange={listing.acceptsExchange}
          installmentAvailable={listing.installmentAvailable}
        />

        <Separator className="my-1" />

        {/* Spec grid */}
        {visibleSpecs.length > 0 && (
          <View className="gap-1">
            <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Specifications
            </Text>
            <View className="flex-row flex-wrap">
              {visibleSpecs.map((spec) => (
                <SpecItem key={spec.label} label={spec.label} value={spec.value} />
              ))}
            </View>
          </View>
        )}

        <Separator className="my-1" />

        {/* Description */}
        {listing.description && (
          <View className="gap-1">
            <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </Text>
            <Text className="text-base text-foreground leading-5">
              {listing.description}
            </Text>
          </View>
        )}

        <Separator className="my-1" />

        {/* Seller block */}
        <SellerBlock
          cityName={maps.cityName(listing.cityId)}
          regionName={maps.regionName(listing.regionId)}
          locationText={listing.locationText}
          contactPhone={listing.contactPhone}
          allowCalls={listing.allowCalls}
        />
      </View>

      {/* Bottom padding for CTA */}
      <View className="h-4" />
    </ScrollView>
  );
}
