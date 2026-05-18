export const queryKeys = {
  me: () => ["me"] as const,

  catalog: {
    all: () => ["catalog"] as const,
    brands: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "brands", locale] as const,
    models: (brandId: string) =>
      [...queryKeys.catalog.all(), "models", brandId] as const,
    generations: (modelId: string) =>
      [...queryKeys.catalog.all(), "generations", modelId] as const,
    colors: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "colors", locale] as const,
    bodyTypes: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "body-types", locale] as const,
    engineTypes: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "engine-types", locale] as const,
    transmissions: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "transmissions", locale] as const,
    driveTypes: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "drive-types", locale] as const,
    regions: (locale: string = "ru") =>
      [...queryKeys.catalog.all(), "regions", locale] as const,
    cities: (regionId: string) =>
      [...queryKeys.catalog.all(), "cities", regionId] as const,
  },

  listings: {
    all: () => ["listings"] as const,
    list: (filters: unknown) =>
      [...queryKeys.listings.all(), "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.listings.all(), "detail", id] as const,
    myListings: () => [...queryKeys.listings.all(), "my-listings"] as const,
    myDrafts: () => [...queryKeys.listings.all(), "my-drafts"] as const,
  },

  uploads: {
    all: () => ["uploads"] as const,
    presign: () => [...queryKeys.uploads.all(), "presign"] as const,
  },

  exchangeRates: {
    all: () => ["exchange-rates"] as const,
  },

  favorites: {
    all: () => ["favorites"] as const,
    list: () => [...queryKeys.favorites.all(), "list"] as const,
  },

  conversations: {
    all: () => ["conversations"] as const,
    list: () => [...queryKeys.conversations.all(), "list"] as const,
    detail: (id: string) =>
      [...queryKeys.conversations.all(), "detail", id] as const,
  },
};
