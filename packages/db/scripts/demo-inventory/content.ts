export type DemoSeller = {
  readonly key: string;
  readonly id: string;
  readonly kind: "private" | "dealership";
  readonly displayName: string;
  readonly locale: "ru" | "tk";
  readonly memberSince: string;
  readonly nameNumber: number;
  readonly avatarIndex: number;
};

export type DemoCar = {
  readonly slug: string;
  readonly sellerKey: string;
  readonly brandSlug: string;
  readonly modelSlug: string;
  readonly year: number;
  readonly mileageKm: number;
  readonly priceAmount: number;
  readonly priceCurrency: "TMT" | "USD" | "AED";
  readonly colorEn: string;
  readonly bodyTypeEn: string;
  readonly engineTypeEn: string;
  readonly transmissionEn: string;
  readonly driveTypeEn: string;
  readonly enginePower: number;
  readonly regionSlug: string;
  readonly citySlug: string;
  readonly condition: "new" | "used";
  readonly damaged: boolean;
  readonly knownIssuesText?: string;
  readonly acceptsExchange: boolean;
  readonly installmentAvailable: boolean;
  readonly descriptionLocale: "ru" | "tk" | "en";
  readonly description: string;
};

export const DEMO_SELLERS: readonly DemoSeller[] = [];
export const DEMO_CARS: readonly DemoCar[] = [];
